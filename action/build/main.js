import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as core from "@actions/core";
import { analyze } from "cpd-diff";
import { resolveEngine } from "@cpd-diff/engines";
import { renderJson, renderSarif } from "@cpd-diff/reporters";
import { assertSafeEvent, parseList, resolveBase } from "./config.js";
export async function run() {
    assertSafeEvent(process.env.GITHUB_EVENT_NAME ?? "");
    const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const event = await readEvent(process.env.GITHUB_EVENT_PATH);
    const engine = choice("engine", ["jscpd", "pmd"]);
    const mode = choice("mode", ["changed-files", "changed-lines"]);
    const cacheRoot = process.env.RUNNER_TOOL_CACHE ?? path.join(repositoryRoot, ".cpd-diff", "tools");
    const enginePath = await resolveEngine(engine, path.join(cacheRoot, "cpd-diff", engine));
    const options = {
        base: resolveBase(core.getInput("base"), event),
        engine,
        enginePath,
        exclude: parseList(core.getInput("exclude")),
        extension: parseList(core.getInput("extension")),
        format: "json",
        head: core.getInput("head") || "HEAD",
        include: parseList(core.getInput("include")),
        language: required("language"),
        minimumLines: positiveInteger("minimum-lines", 5),
        minimumTokens: positiveInteger("minimum-tokens", 100),
        mode,
        timeoutMilliseconds: positiveInteger("timeout-milliseconds", 120_000),
        warnOnly: core.getBooleanInput("warn-only"),
    };
    const report = await analyze(options, repositoryRoot);
    const reportDirectory = path.join(repositoryRoot, ".cpd-diff");
    const jsonPath = path.join(reportDirectory, "report.json");
    const sarifPath = path.join(reportDirectory, "report.sarif");
    await mkdir(reportDirectory, { recursive: true });
    await core.summary
        .addHeading("cpd-diff")
        .addRaw(`${report.summary.violationCount} new duplication violation(s) detected.`)
        .write();
    await Promise.all([
        writeFile(jsonPath, renderJson(report), { encoding: "utf8", flag: "w" }),
        writeFile(sarifPath, renderSarif(report), { encoding: "utf8", flag: "w" }),
    ]);
    core.setOutput("violation-count", report.summary.violationCount);
    core.setOutput("json-path", jsonPath);
    core.setOutput("sarif-path", sarifPath);
    if (report.summary.violationCount > 0 && !options.warnOnly) {
        core.setFailed(`${report.summary.violationCount} new duplication violation(s) detected`);
    }
}
async function readEvent(eventPath) {
    if (eventPath === undefined || eventPath.length === 0)
        return {};
    return JSON.parse(await readFile(eventPath, "utf8"));
}
function required(name) {
    return core.getInput(name, { required: true });
}
function positiveInteger(name, fallback) {
    const raw = core.getInput(name);
    if (raw.length === 0)
        return fallback;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 1)
        throw new Error(`${name} must be a positive integer`);
    return parsed;
}
function choice(name, choices) {
    const value = required(name);
    if (!choices.includes(value))
        throw new Error(`${name} must be one of: ${choices.join(", ")}`);
    return value;
}
if (process.env.NODE_ENV !== "test") {
    run().catch((cause) => core.setFailed(cause instanceof Error ? cause.message : String(cause)));
}
//# sourceMappingURL=main.js.map
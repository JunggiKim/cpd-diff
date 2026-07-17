import { randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";

import type { CloneGroup } from "@cpd-diff/core";

import { type CommonAdapterOptions, validateCommonOptions } from "../adapter-options.js";
import { runProcess } from "../process/run.js";
import { parseJscpdReport } from "./report.js";

export type JscpdAdapterOptions = CommonAdapterOptions &
  Readonly<{
    minimumLines: number;
    outputDirectory: string;
  }>;

const MAXIMUM_REPORT_BYTES = 256 * 1024 * 1024;

export async function detectWithJscpd(options: JscpdAdapterOptions): Promise<CloneGroup[]> {
  const files = validateCommonOptions(options);
  if (!Number.isSafeInteger(options.minimumLines) || options.minimumLines < 1) {
    throw new Error("Minimum lines must be a positive integer");
  }
  if (files.length < 2) return [];

  await mkdir(options.outputDirectory, { recursive: true, mode: 0o700 });
  const reportFile = path.join(options.outputDirectory, "jscpd-report.json");
  await removeStaleReport(reportFile);
  const stagingDirectory = path.join(options.outputDirectory, `input-${randomUUID()}`);
  await stageFiles(files, options.repositoryRoot, stagingDirectory);
  try {
    await runProcess({
      args: buildArguments(options),
      command: options.executable,
      cwd: stagingDirectory,
      maximumOutputBytes: 1024 * 1024,
      timeoutMilliseconds: options.timeoutMilliseconds,
    });
    return parseJscpdReport(await readBoundedReport(reportFile), options.repositoryRoot);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

function buildArguments(options: JscpdAdapterOptions): string[] {
  return [
    "--min-tokens",
    String(options.minimumTokens),
    "--min-lines",
    String(options.minimumLines),
    "--format",
    options.language,
    "--reporters",
    "json",
    "--output",
    options.outputDirectory,
    "--silent",
    "--no-tips",
    "--no-colors",
    "--no-gitignore",
    "--",
    ".",
  ];
}

async function stageFiles(
  files: readonly string[],
  repositoryRoot: string,
  stagingDirectory: string,
): Promise<void> {
  for (const file of files) {
    const source = path.join(repositoryRoot, file);
    const sourceStatus = await lstat(source);
    if (!sourceStatus.isFile() || sourceStatus.isSymbolicLink()) {
      throw new Error(`jscpd input is not a regular file: ${file}`);
    }
    const destination = path.join(stagingDirectory, file);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await copyFile(source, destination);
  }
}

async function readBoundedReport(reportFile: string): Promise<string> {
  const reportStatus = await stat(reportFile);
  if (!reportStatus.isFile() || reportStatus.size > MAXIMUM_REPORT_BYTES) {
    throw new Error("Invalid jscpd report file");
  }
  return await readFile(reportFile, "utf8");
}

async function removeStaleReport(reportFile: string): Promise<void> {
  try {
    await unlink(reportFile);
  } catch (cause) {
    if (!(cause instanceof Error && "code" in cause && cause.code === "ENOENT")) throw cause;
  }
}

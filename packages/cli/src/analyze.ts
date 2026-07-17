import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  filterChangedFileGroups,
  filterChangedLineGroups,
  fingerprintFragment,
  mergeCloneGroups,
  selectFiles,
  splitChangedBaseline,
} from "@cpd-diff/core";
import { detectWithJscpd, detectWithPmd } from "@cpd-diff/engines";
import { createReportDocument, type ReportDocument } from "@cpd-diff/reporters";

import type { CliOptions } from "./options.js";
import { changedFiles, changedLines, trackedFiles, verifyCommitRef } from "./git.js";
import { unsupportedFiles } from "./files.js";

const LANGUAGE_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  c: [".c", ".h"],
  cpp: [".cc", ".cpp", ".cxx", ".h", ".hpp"],
  go: [".go"],
  java: [".java"],
  javascript: [".js", ".jsx", ".mjs", ".cjs"],
  kotlin: [".kt", ".kts"],
  python: [".py"],
  typescript: [".ts", ".tsx", ".mts", ".cts"],
};

export async function analyze(options: CliOptions, repositoryRoot: string): Promise<ReportDocument> {
  await Promise.all([
    verifyCommitRef(repositoryRoot, options.base),
    verifyCommitRef(repositoryRoot, options.head),
  ]);
  const changes = await changedFiles(repositoryRoot, options.base, options.head);
  const preliminary = selectFiles(await trackedFiles(repositoryRoot), {
    binaryPaths: new Set(),
    exclude: effectiveExclude(options.exclude),
    extensions: effectiveExtensions(options),
    include: options.include.length === 0 ? ["**"] : options.include,
  });
  const selected = selectFiles(preliminary, {
    binaryPaths: await unsupportedFiles(repositoryRoot, preliminary),
    exclude: [],
    extensions: effectiveExtensions(options),
    include: ["**"],
  });
  const split = splitChangedBaseline(selected, changes);
  const outputDirectory = path.join(repositoryRoot, ".cpd-diff", "reports", randomUUID());

  try {
    const groups = await detect(options, selected, repositoryRoot, outputDirectory);
    const relevant =
      options.mode === "changed-files"
        ? filterChangedFileGroups(groups, new Set(split.changed))
        : filterChangedLineGroups(
            groups,
            await changedLines(repositoryRoot, options.base, options.head, split.changed),
          );
    const fingerprinted = await Promise.all(
      relevant.map(async (group) => {
        const primary = group.occurrences[0];
        if (primary === undefined) throw new Error("Clone group has no occurrences");
        return {
          fingerprint: fingerprintFragment(await fragment(repositoryRoot, primary)),
          group,
        };
      }),
    );
    return createReportDocument({
      base: options.base,
      changedPaths: new Set(split.changed),
      engine: options.engine,
      groups: mergeCloneGroups(fingerprinted),
      head: options.head,
      mode: options.mode,
      toolVersion: "0.0.0",
    });
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

async function detect(
  options: CliOptions,
  files: readonly string[],
  repositoryRoot: string,
  outputDirectory: string,
) {
  if (options.engine === "jscpd") {
    return await detectWithJscpd({
      executable: options.enginePath,
      files,
      language: options.language,
      minimumLines: options.minimumLines,
      minimumTokens: options.minimumTokens,
      outputDirectory,
      repositoryRoot,
      timeoutMilliseconds: options.timeoutMilliseconds,
    });
  }
  return await detectWithPmd({
    executable: options.enginePath,
    files,
    language: options.language,
    minimumTokens: options.minimumTokens,
    repositoryRoot,
    timeoutMilliseconds: options.timeoutMilliseconds,
  });
}

async function fragment(repositoryRoot: string, occurrence: { file: string; startLine: number; endLine: number }) {
  const source = await readFile(path.join(repositoryRoot, occurrence.file), "utf8");
  const lines = source.split(/\r?\n/u);
  const selected = lines.slice(occurrence.startLine - 1, occurrence.endLine).join("\n");
  if (selected.length === 0) throw new Error(`Clone occurrence is outside the source file: ${occurrence.file}`);
  return selected;
}

function effectiveExtensions(options: CliOptions): readonly string[] {
  const extensions = options.extension.length > 0 ? options.extension : LANGUAGE_EXTENSIONS[options.language];
  if (extensions === undefined) throw new Error(`No default extensions for language: ${options.language}`);
  return extensions.map((extension) => (extension.startsWith(".") ? extension : `.${extension}`));
}

function effectiveExclude(exclude: readonly string[]): readonly string[] {
  return exclude.length > 0
    ? exclude
    : [".git/**", ".cpd-diff/**", "**/node_modules/**", "**/dist/**", "**/build/**"];
}

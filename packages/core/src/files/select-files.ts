import path from "node:path";

import picomatch from "picomatch";

import type { ChangedFile } from "../git/changed-files.js";
import { normalizeRepositoryPath } from "./repository-path.js";

export type FileSelectionOptions = Readonly<{
  binaryPaths: ReadonlySet<string>;
  exclude: readonly string[];
  extensions: readonly string[];
  include: readonly string[];
}>;

export type ChangedBaselineSplit = Readonly<{
  baseline: readonly string[];
  changed: readonly string[];
}>;

export function selectFiles(
  trackedPaths: readonly string[],
  options: FileSelectionOptions,
): string[] {
  const include = compilePatterns(options.include);
  const exclude = compilePatterns(options.exclude);
  const extensions = new Set(options.extensions.map(normalizeExtension));
  const binaryPaths = new Set(
    [...options.binaryPaths].map(normalizeRepositoryPath),
  );

  return [...new Set(trackedPaths.map(normalizeRepositoryPath))]
    .filter((file) => extensions.has(path.posix.extname(file)))
    .filter((file) => include(file) && !exclude(file) && !binaryPaths.has(file))
    .sort(comparePaths);
}

export function splitChangedBaseline(
  selectedPaths: readonly string[],
  changedFiles: readonly ChangedFile[],
): ChangedBaselineSplit {
  const selected = new Set(selectedPaths.map(normalizeRepositoryPath));
  const changedCandidates = new Set(
    changedFiles.map(({ path: file }) => normalizeRepositoryPath(file)),
  );
  const changed = [...selected]
    .filter((file) => changedCandidates.has(file))
    .sort(comparePaths);
  const baseline = [...selected]
    .filter((file) => !changedCandidates.has(file))
    .sort(comparePaths);
  return { baseline, changed };
}

function compilePatterns(
  patterns: readonly string[],
): (file: string) => boolean {
  if (patterns.length === 0) return () => false;
  try {
    return picomatch([...patterns], { dot: true, nonegate: true });
  } catch (cause) {
    throw new Error("Invalid file selection pattern", { cause });
  }
}

function normalizeExtension(extension: string): string {
  if (!/^\.[A-Za-z0-9]+$/u.test(extension)) {
    throw new Error(`Invalid file extension: ${JSON.stringify(extension)}`);
  }
  return extension;
}

function comparePaths(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

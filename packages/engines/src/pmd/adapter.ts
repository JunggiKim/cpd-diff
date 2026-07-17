import type { CloneGroup } from "@cpd-diff/core";

import {
  asPositionalPath,
  type CommonAdapterOptions,
  validateCommonOptions,
} from "../adapter-options.js";
import { runProcess } from "../process/run.js";
import { parsePmdReport } from "./report.js";

export type PmdAdapterOptions = CommonAdapterOptions;

export async function detectWithPmd(
  options: PmdAdapterOptions,
): Promise<CloneGroup[]> {
  const files = validateCommonOptions(options);
  if (files.length < 2) return [];

  const { stdout } = await runProcess({
    args: buildArguments(options, files),
    command: options.executable,
    cwd: options.repositoryRoot,
    maximumOutputBytes: 256 * 1024 * 1024,
    timeoutMilliseconds: options.timeoutMilliseconds,
  });
  return parsePmdReport(stdout, options.repositoryRoot);
}

function buildArguments(
  options: PmdAdapterOptions,
  files: readonly string[],
): string[] {
  return [
    "cpd",
    "--minimum-tokens",
    String(options.minimumTokens),
    "--language",
    options.language,
    "--format",
    "xml",
    "--no-fail-on-violation",
    "--fail-on-error",
    ...files.flatMap((file) => ["--dir", asPositionalPath(file)]),
  ];
}

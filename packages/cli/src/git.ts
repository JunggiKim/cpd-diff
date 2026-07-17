import { Buffer } from "node:buffer";

import {
  parseNameStatusZ,
  parseUnifiedZeroContext,
  type ChangedFile,
  type LineRange,
} from "@cpd-diff/core";
import { runProcess } from "@cpd-diff/engines";

const MAXIMUM_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;

export async function verifyCommitRef(
  cwd: string,
  reference: string,
): Promise<void> {
  validateReference(reference);
  await git(cwd, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${reference}^{commit}`,
  ]);
}

export async function changedFiles(
  cwd: string,
  base: string,
  head: string,
): Promise<ChangedFile[]> {
  validateReference(base);
  validateReference(head);
  const output = await git(cwd, [
    "diff",
    "--name-status",
    "-z",
    "--find-renames",
    "--find-copies",
    "--diff-filter=ACMRD",
    base,
    head,
    "--",
  ]);
  return parseNameStatusZ(Buffer.from(output, "utf8"));
}

export async function trackedFiles(cwd: string): Promise<string[]> {
  return parseNullTerminated(
    await git(cwd, [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    ]),
  );
}

export async function changedLines(
  cwd: string,
  base: string,
  head: string,
  files: readonly string[],
): Promise<Map<string, readonly LineRange[]>> {
  validateReference(base);
  validateReference(head);
  const entries = await Promise.all(
    files.map(async (file) => {
      const diff = await git(cwd, [
        "diff",
        "--unified=0",
        "--no-ext-diff",
        base,
        head,
        "--",
        file,
      ]);
      return [file, parseUnifiedZeroContext(diff)] as const;
    }),
  );
  return new Map(entries);
}

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const result = await runProcess({
    args,
    command: "git",
    cwd,
    maximumOutputBytes: MAXIMUM_GIT_OUTPUT_BYTES,
    timeoutMilliseconds: 60_000,
  });
  return result.stdout;
}

function parseNullTerminated(output: string): string[] {
  if (output.length === 0) return [];
  if (!output.endsWith("\0"))
    throw new Error("Invalid NUL-terminated Git output");
  return output.slice(0, -1).split("\0");
}

function validateReference(reference: string): void {
  if (
    reference.length === 0 ||
    reference.startsWith("-") ||
    reference.includes("\0") ||
    reference.includes("\r") ||
    reference.includes("\n")
  ) {
    throw new Error(`Invalid Git reference: ${JSON.stringify(reference)}`);
  }
}

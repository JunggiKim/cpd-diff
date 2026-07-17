import { normalizeRepositoryPath } from "@cpd-diff/core";

export type CommonAdapterOptions = Readonly<{
  executable: string;
  files: readonly string[];
  language: string;
  minimumTokens: number;
  repositoryRoot: string;
  timeoutMilliseconds: number;
}>;

export function validateCommonOptions(options: CommonAdapterOptions): string[] {
  if (!/^[a-z][a-z0-9-]*$/u.test(options.language))
    throw new Error("Invalid engine language");
  if (
    !Number.isSafeInteger(options.minimumTokens) ||
    options.minimumTokens < 1
  ) {
    throw new Error("Minimum tokens must be a positive integer");
  }
  if (
    !Number.isSafeInteger(options.timeoutMilliseconds) ||
    options.timeoutMilliseconds < 1
  ) {
    throw new Error("Engine timeout must be a positive integer");
  }
  return [...new Set(options.files.map(normalizeRepositoryPath))].sort(
    compareText,
  );
}

export function asPositionalPath(file: string): string {
  return `./${file}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

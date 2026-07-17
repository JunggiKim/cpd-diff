import { createCloneGroup, type CloneGroup } from "@cpd-diff/core";

import { normalizeReportedPath } from "../report-path.js";

export function parseJscpdReport(report: string, repositoryRoot: string): CloneGroup[] {
  try {
    const root = parseJsonObject(report);
    if (!Array.isArray(root.duplicates)) throw invalidJscpdReport();
    return root.duplicates.map((duplicate) => parseDuplicate(duplicate, repositoryRoot));
  } catch (cause) {
    if (cause instanceof Error && cause.message === "Invalid jscpd report") throw cause;
    throw new Error("Invalid jscpd report", { cause });
  }
}

function parseDuplicate(value: unknown, repositoryRoot: string): CloneGroup {
  const duplicate = requireObject(value);
  const first = requireObject(duplicate.firstFile);
  const second = requireObject(duplicate.secondFile);
  return createCloneGroup({
    lines: requirePositiveInteger(duplicate.lines),
    occurrences: [
      parseOccurrence(first, repositoryRoot),
      parseOccurrence(second, repositoryRoot),
    ],
    tokens: requirePositiveInteger(duplicate.tokens),
  });
}

function parseOccurrence(value: Record<string, unknown>, repositoryRoot: string) {
  return {
    endLine: requirePositiveInteger(value.end),
    file: normalizeReportedPath(requireString(value.name), repositoryRoot),
    startLine: requirePositiveInteger(value.start),
  };
}

function parseJsonObject(report: string): Record<string, unknown> {
  return requireObject(JSON.parse(report) as unknown);
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalidJscpdReport();
  return value as Record<string, unknown>;
}

function requirePositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw invalidJscpdReport();
  }
  return value;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw invalidJscpdReport();
  return value;
}

function invalidJscpdReport(): Error {
  return new Error("Invalid jscpd report");
}

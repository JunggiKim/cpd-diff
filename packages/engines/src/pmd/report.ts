import { createCloneGroup, type CloneGroup } from "@cpd-diff/core";
import { XMLParser } from "fast-xml-parser";

import { normalizeReportedPath } from "../report-path.js";

type XmlRecord = Record<string, unknown>;

const parser = new XMLParser({
  allowBooleanAttributes: false,
  ignoreAttributes: false,
  parseAttributeValue: true,
  processEntities: false,
  trimValues: false,
});

export function parsePmdReport(
  report: string,
  repositoryRoot: string,
): CloneGroup[] {
  try {
    if (/<!DOCTYPE|<!ENTITY/iu.test(report)) throw invalidPmdReport();
    const parsed = requireObject(parser.parse(report) as unknown);
    const root = requireObject(parsed["pmd-cpd"]);
    const duplications = asArray(root.duplication);
    return duplications.map((duplication) =>
      parseDuplication(duplication, repositoryRoot),
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === "Invalid PMD report")
      throw cause;
    throw new Error("Invalid PMD report", { cause });
  }
}

function parseDuplication(value: unknown, repositoryRoot: string): CloneGroup {
  const duplication = requireObject(value);
  const files = asArray(duplication.file);
  return createCloneGroup({
    lines: requirePositiveInteger(duplication["@_lines"]),
    occurrences: files.map((file) => parseOccurrence(file, repositoryRoot)),
    tokens: requirePositiveInteger(duplication["@_tokens"]),
  });
}

function parseOccurrence(value: unknown, repositoryRoot: string) {
  const file = requireObject(value);
  return {
    endLine: requirePositiveInteger(file["@_endline"]),
    file: normalizeReportedPath(requireString(file["@_path"]), repositoryRoot),
    startLine: requirePositiveInteger(file["@_line"]),
  };
}

function asArray(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function requireObject(value: unknown): XmlRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw invalidPmdReport();
  return value as XmlRecord;
}

function requirePositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw invalidPmdReport();
  }
  return value;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw invalidPmdReport();
  return value;
}

function invalidPmdReport(): Error {
  return new Error("Invalid PMD report");
}

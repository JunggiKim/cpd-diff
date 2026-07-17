import type { FingerprintedCloneGroup } from "@cpd-diff/core";

export type EngineName = "jscpd" | "pmd";
export type DetectionMode = "changed-files" | "changed-lines";

export type ReportOccurrence = Readonly<{
  endLine: number;
  file: string;
  isChanged: boolean;
  startLine: number;
}>;

export type ReportViolation = Readonly<{
  fingerprint: string;
  lines: number;
  occurrences: readonly ReportOccurrence[];
  tokens: number;
}>;

export type ReportDocument = Readonly<{
  schemaVersion: "1.0.0";
  tool: Readonly<{ name: "cpd-diff"; version: string }>;
  analysis: Readonly<{
    base: string;
    engine: EngineName;
    head: string;
    mode: DetectionMode;
  }>;
  summary: Readonly<{
    occurrenceCount: number;
    violationCount: number;
  }>;
  violations: readonly ReportViolation[];
}>;

export type ReportDocumentInput = Readonly<{
  base: string;
  changedPaths: ReadonlySet<string>;
  engine: EngineName;
  groups: readonly FingerprintedCloneGroup[];
  head: string;
  mode: DetectionMode;
  toolVersion: string;
}>;

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;

export function createReportDocument(input: ReportDocumentInput): ReportDocument {
  const violations = input.groups.map(({ fingerprint, group }) => {
    if (!FINGERPRINT_PATTERN.test(fingerprint)) throw new Error("Invalid report fingerprint");
    return Object.freeze({
      fingerprint,
      lines: group.lines,
      occurrences: Object.freeze(
        group.occurrences.map((occurrence) =>
          Object.freeze({
            ...occurrence,
            isChanged: input.changedPaths.has(occurrence.file),
          }),
        ),
      ),
      tokens: group.tokens,
    });
  });
  return Object.freeze({
    schemaVersion: "1.0.0",
    tool: Object.freeze({ name: "cpd-diff", version: input.toolVersion }),
    analysis: Object.freeze({
      base: input.base,
      engine: input.engine,
      head: input.head,
      mode: input.mode,
    }),
    summary: Object.freeze({
      occurrenceCount: violations.reduce((total, violation) => total + violation.occurrences.length, 0),
      violationCount: violations.length,
    }),
    violations: Object.freeze(violations),
  });
}

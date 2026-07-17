import type { Log, Location, Result } from "sarif";

import type { ReportDocument, ReportOccurrence, ReportViolation } from "./document.js";

const RULE_ID = "cpd-diff/new-duplication";

export function createSarif(report: ReportDocument): Log {
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "cpd-diff",
            version: report.tool.version,
            informationUri: "https://github.com/JunggiKim/cpd-diff",
            rules: [
              {
                id: RULE_ID,
                shortDescription: { text: "New code duplication introduced by this change" },
                helpUri: "https://github.com/JunggiKim/cpd-diff#how-it-works",
                defaultConfiguration: { level: "error" },
              },
            ],
          },
        },
        results: report.violations.map(createResult),
      },
    ],
  };
}

export function renderSarif(report: ReportDocument): string {
  return `${JSON.stringify(createSarif(report), null, 2)}\n`;
}

function createResult(violation: ReportViolation): Result {
  const [primary, ...related] = violation.occurrences;
  if (primary === undefined) throw new Error("SARIF violation has no occurrence");
  return {
    ruleId: RULE_ID,
    level: "error",
    message: {
      text: `${violation.lines}-line duplication (${violation.tokens} tokens) introduced by this change`,
    },
    partialFingerprints: { "cpd-diff/v1": violation.fingerprint },
    locations: [createLocation(primary)],
    relatedLocations: related.map((occurrence, index) => ({
      ...createLocation(occurrence),
      id: index + 1,
    })),
  };
}

function createLocation(occurrence: ReportOccurrence): Location {
  return {
    physicalLocation: {
      artifactLocation: {
        uri: occurrence.file.split("/").map(encodeURIComponent).join("/"),
        uriBaseId: "%SRCROOT%",
      },
      region: {
        startLine: occurrence.startLine,
        endLine: occurrence.endLine,
      },
    },
  };
}

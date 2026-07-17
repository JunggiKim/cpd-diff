import { createCloneGroup } from "@cpd-diff/core";
import type { Log } from "sarif";
import { describe, expect, test } from "vitest";

import { createReportDocument } from "../src/document.js";
import { createSarif, renderSarif } from "../src/sarif.js";

describe("createSarif", () => {
  test("maps each group to SARIF 2.1.0 primary and related locations", () => {
    const report = createReportDocument({
      base: "main",
      changedPaths: new Set(["src/a file.ts"]),
      engine: "pmd",
      groups: [
        {
          fingerprint: "f".repeat(64),
          group: createCloneGroup({
            lines: 3,
            occurrences: [
              { endLine: 4, file: "src/a file.ts", startLine: 2 },
              { endLine: 12, file: "src/#base.ts", startLine: 10 },
            ],
            tokens: 15,
          }),
        },
      ],
      head: "HEAD",
      mode: "changed-files",
      toolVersion: "1.0.0",
    });

    const sarif: Log = createSarif(report);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.results?.[0]).toMatchObject({
      ruleId: "cpd-diff/new-duplication",
      level: "error",
      partialFingerprints: { "cpd-diff/v1": "f".repeat(64) },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: "src/a%20file.ts", uriBaseId: "%SRCROOT%" },
            region: { startLine: 2, endLine: 4 },
          },
        },
      ],
      relatedLocations: [
        {
          id: 1,
          physicalLocation: {
            artifactLocation: { uri: "src/%23base.ts", uriBaseId: "%SRCROOT%" },
            region: { startLine: 10, endLine: 12 },
          },
        },
      ],
    });
    expect(JSON.parse(renderSarif(report))).toEqual(sarif);
  });
});

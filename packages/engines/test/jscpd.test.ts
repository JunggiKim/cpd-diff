import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { parseJscpdReport } from "../src/jscpd/report.js";

describe("parseJscpdReport", () => {
  test("normalizes the verified jscpd v5 JSON contract", async () => {
    const report = await readFile(new URL("./fixtures/jscpd-report.json", import.meta.url), "utf8");

    expect(parseJscpdReport(report, process.cwd())).toEqual([
      {
        lines: 6,
        occurrences: [
          { endLine: 6, file: "src/a.ts", startLine: 1 },
          { endLine: 16, file: "src/b.ts", startLine: 11 },
        ],
        tokens: 33,
      },
    ]);
  });

  test.each([
    "not-json",
    "{}",
    '{"duplicates":"wrong"}',
    '{"duplicates":[{"lines":1,"tokens":1,"firstFile":{},"secondFile":{}}]}',
  ])("fails closed for malformed output", (report) => {
    expect(() => parseJscpdReport(report, process.cwd())).toThrow(/invalid jscpd report/i);
  });

  test("rejects a reported path outside the repository", () => {
    const report = JSON.stringify({
      duplicates: [
        {
          firstFile: { start: 1, end: 2, name: "../outside.ts" },
          secondFile: { start: 1, end: 2, name: "inside.ts" },
          lines: 2,
          tokens: 10,
        },
      ],
    });

    expect(() => parseJscpdReport(report, process.cwd())).toThrow(/invalid jscpd report/i);
  });
});

import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { parsePmdReport } from "../src/pmd/report.js";

describe("parsePmdReport", () => {
  test("normalizes the verified PMD 7 XML contract with all occurrences", async () => {
    const report = await readFile(
      new URL("./fixtures/pmd-report.xml", import.meta.url),
      "utf8",
    );

    expect(parsePmdReport(report, process.cwd())).toEqual([
      {
        lines: 7,
        occurrences: [
          { endLine: 8, file: "src/A.java", startLine: 2 },
          { endLine: 18, file: "src/B.java", startLine: 12 },
          { endLine: 28, file: "src/C.java", startLine: 22 },
        ],
        tokens: 27,
      },
    ]);
  });

  test("accepts a valid empty report", () => {
    expect(
      parsePmdReport(
        '<pmd-cpd xmlns="https://pmd-code.org/schema/cpd-report"/>',
        process.cwd(),
      ),
    ).toEqual([]);
  });

  test.each([
    "not-xml",
    "<wrong/>",
    '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><pmd-cpd/>',
    '<pmd-cpd><duplication lines="0" tokens="1"><file line="1" endline="1" path="a.ts"/><file line="1" endline="1" path="b.ts"/></duplication></pmd-cpd>',
  ])("fails closed for malformed or unsafe XML", (report) => {
    expect(() => parsePmdReport(report, process.cwd())).toThrow(
      /invalid pmd report/i,
    );
  });
});

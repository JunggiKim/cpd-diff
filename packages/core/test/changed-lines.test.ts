import { describe, expect, test } from "vitest";

import { parseUnifiedZeroContext } from "../src/git/changed-lines.js";

describe("parseUnifiedZeroContext", () => {
  test("returns inclusive head ranges for additions and modifications", () => {
    const diff = [
      "diff --git a/file.ts b/file.ts",
      "@@ -1,0 +2 @@",
      "+added",
      "@@ -10,2 +11,3 @@ function",
      "-old",
      "+new",
      "@@ -20,2 +22,0 @@",
      "-deleted only",
      "",
    ].join("\n");

    expect(parseUnifiedZeroContext(diff)).toEqual([
      { endLine: 2, startLine: 2 },
      { endLine: 13, startLine: 11 },
    ]);
  });

  test("supports CRLF output and merges overlapping or adjacent ranges", () => {
    const diff = "@@ -1 +1,2 @@\r\n@@ -3 +3,1 @@\r\n@@ -9 +10,2 @@\r\n";

    expect(parseUnifiedZeroContext(diff)).toEqual([
      { endLine: 3, startLine: 1 },
      { endLine: 11, startLine: 10 },
    ]);
  });

  test("returns no ranges for empty and binary diffs", () => {
    expect(parseUnifiedZeroContext("")).toEqual([]);
    expect(parseUnifiedZeroContext("Binary files a/image.png and b/image.png differ\n")).toEqual([]);
  });

  test.each([
    "@@ malformed @@",
    "@@ -1 +0 @@",
    "@@ -1 +2,-1 @@",
  ])("rejects malformed hunk headers: %s", (header) => {
    expect(() => parseUnifiedZeroContext(`${header}\n`)).toThrow(
      /invalid git unified diff output/i,
    );
  });
});

import { describe, expect, test } from "vitest";

import { parseNameStatusZ } from "../src/git/changed-files.js";

describe("parseNameStatusZ", () => {
  test("keeps A, C, M, and R destinations while excluding deletions", () => {
    const output = Buffer.from(
      "A\0added.ts\0C100\0source.ts\0copied.ts\0M\0modified.ts\0R095\0old.ts\0renamed.ts\0D\0deleted.ts\0",
    );

    expect(parseNameStatusZ(output)).toEqual([
      { path: "added.ts", status: "A" },
      { path: "copied.ts", previousPath: "source.ts", status: "C" },
      { path: "modified.ts", status: "M" },
      { path: "renamed.ts", previousPath: "old.ts", status: "R" },
    ]);
  });

  test("preserves spaces, tabs, newlines, and unicode in paths", () => {
    const output = Buffer.from("M\0src/a b\t한글\nfile.ts\0");

    expect(parseNameStatusZ(output)).toEqual([
      { path: "src/a b\t한글\nfile.ts", status: "M" },
    ]);
  });

  test.each([
    ["unknown status", Buffer.from("X\0file.ts\0")],
    ["missing path", Buffer.from("M\0")],
    ["truncated rename", Buffer.from("R100\0old.ts\0")],
    ["missing final NUL", Buffer.from("A\0file.ts")],
  ])("rejects malformed output: %s", (_description, output) => {
    expect(() => parseNameStatusZ(output)).toThrow(
      /invalid git name-status output/i,
    );
  });
});

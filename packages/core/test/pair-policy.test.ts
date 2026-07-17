import { describe, expect, test } from "vitest";

import { createCloneGroup } from "../src/clones/clone-group.js";
import { filterChangedFileGroups } from "../src/policy/changed-files.js";

const occurrence = (file: string, startLine: number) => ({
  endLine: startLine + 4,
  file,
  startLine,
});

describe("filterChangedFileGroups", () => {
  test.each([
    ["C,C", [occurrence("c1.ts", 1), occurrence("c2.ts", 1)], true],
    ["C,B", [occurrence("c1.ts", 1), occurrence("b1.ts", 1)], true],
    ["B,B", [occurrence("b1.ts", 1), occurrence("b2.ts", 1)], false],
    ["C,B,B", [occurrence("c1.ts", 1), occurrence("b1.ts", 1), occurrence("b2.ts", 1)], true],
    ["changed self clone", [occurrence("c1.ts", 1), occurrence("c1.ts", 20)], true],
    ["baseline self clone", [occurrence("b1.ts", 1), occurrence("b1.ts", 20)], false],
  ])("applies the pair truth table for %s", (_description, occurrences, expected) => {
    const group = createCloneGroup({ lines: 5, occurrences, tokens: 20 });

    expect(filterChangedFileGroups([group], new Set(["c1.ts", "c2.ts"]))).toEqual(
      expected ? [group] : [],
    );
  });

  test("rejects unsafe changed paths", () => {
    expect(() => filterChangedFileGroups([], new Set(["../escape.ts"]))).toThrow(
      /unsafe repository path/i,
    );
  });
});

import { describe, expect, test } from "vitest";

import { createCloneGroup } from "../src/clones/clone-group.js";
import { filterChangedLineGroups } from "../src/policy/changed-lines.js";

const group = createCloneGroup({
  lines: 5,
  occurrences: [
    { endLine: 14, file: "changed.ts", startLine: 10 },
    { endLine: 44, file: "baseline.ts", startLine: 40 },
  ],
  tokens: 30,
});

describe("filterChangedLineGroups", () => {
  test.each([
    ["first boundary", [{ endLine: 10, startLine: 10 }], true],
    ["last boundary", [{ endLine: 14, startLine: 14 }], true],
    ["inside", [{ endLine: 12, startLine: 11 }], true],
    ["before", [{ endLine: 9, startLine: 1 }], false],
    ["after", [{ endLine: 20, startLine: 15 }], false],
  ])("handles %s overlap", (_description, ranges, expected) => {
    expect(
      filterChangedLineGroups([group], new Map([["changed.ts", ranges]])),
    ).toEqual(expected ? [group] : []);
  });

  test("drops a changed file occurrence when none of its lines changed", () => {
    expect(
      filterChangedLineGroups(
        [group],
        new Map([["changed.ts", [{ startLine: 1, endLine: 2 }]]]),
      ),
    ).toEqual([]);
  });

  test.each([
    [
      "unsafe path",
      new Map([["../changed.ts", [{ startLine: 1, endLine: 1 }]]]),
    ],
    ["zero line", new Map([["changed.ts", [{ startLine: 0, endLine: 1 }]]])],
    [
      "reversed range",
      new Map([["changed.ts", [{ startLine: 2, endLine: 1 }]]]),
    ],
  ])("rejects %s", (_description, ranges) => {
    expect(() => filterChangedLineGroups([], ranges)).toThrow(
      /invalid changed line ranges/i,
    );
  });
});

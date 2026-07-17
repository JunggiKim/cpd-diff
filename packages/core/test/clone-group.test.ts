import { describe, expect, test } from "vitest";

import { createCloneGroup } from "../src/clones/clone-group.js";

describe("createCloneGroup", () => {
  test("creates a deeply immutable valid clone group", () => {
    const group = createCloneGroup({
      lines: 5,
      occurrences: [
        { endLine: 14, file: "src/a.ts", startLine: 10 },
        { endLine: 34, file: "src/b.ts", startLine: 30 },
      ],
      tokens: 42,
    });

    expect(group).toEqual({
      lines: 5,
      occurrences: [
        { endLine: 14, file: "src/a.ts", startLine: 10 },
        { endLine: 34, file: "src/b.ts", startLine: 30 },
      ],
      tokens: 42,
    });
    expect(Object.isFrozen(group)).toBe(true);
    expect(Object.isFrozen(group.occurrences)).toBe(true);
    expect(Object.isFrozen(group.occurrences[0])).toBe(true);
  });

  test.each([
    ["fewer than two occurrences", { lines: 1, occurrences: [{ endLine: 1, file: "a.ts", startLine: 1 }], tokens: 1 }],
    ["zero tokens", { lines: 1, occurrences: [{ endLine: 1, file: "a.ts", startLine: 1 }, { endLine: 1, file: "b.ts", startLine: 1 }], tokens: 0 }],
    ["invalid range", { lines: 1, occurrences: [{ endLine: 1, file: "a.ts", startLine: 2 }, { endLine: 1, file: "b.ts", startLine: 1 }], tokens: 1 }],
    ["unsafe file", { lines: 1, occurrences: [{ endLine: 1, file: "../a.ts", startLine: 1 }, { endLine: 1, file: "b.ts", startLine: 1 }], tokens: 1 }],
  ])("rejects %s", (_description, input) => {
    expect(() => createCloneGroup(input)).toThrow(/invalid clone group/i);
  });
});

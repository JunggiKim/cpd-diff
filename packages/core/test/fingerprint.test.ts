import { describe, expect, test } from "vitest";

import { createCloneGroup } from "../src/clones/clone-group.js";
import {
  fingerprintFragment,
  mergeCloneGroups,
} from "../src/clones/fingerprint.js";

describe("fingerprintFragment", () => {
  test("normalizes whitespace and line endings deterministically", () => {
    const fingerprints = Array.from({ length: 100 }, () =>
      fingerprintFragment("  const value = 1;\r\nreturn value;  "),
    );

    expect(new Set(fingerprints)).toHaveLength(1);
    expect(fingerprints[0]).toBe(
      fingerprintFragment("const value = 1;\nreturn value;"),
    );
    expect(fingerprints[0]).toMatch(/^[a-f0-9]{64}$/u);
  });

  test("preserves semantically meaningful whitespace inside source lines", () => {
    expect(fingerprintFragment("const value = 'a  b';")).not.toBe(
      fingerprintFragment("const value = 'a b';"),
    );
  });

  test("rejects an empty normalized fragment", () => {
    expect(() => fingerprintFragment(" \r\n\t ")).toThrow(
      /empty clone fragment/i,
    );
  });
});

describe("mergeCloneGroups", () => {
  test("merges occurrences from chunk boundaries and removes exact duplicates", () => {
    const first = createCloneGroup({
      lines: 5,
      occurrences: [
        { endLine: 5, file: "changed.ts", startLine: 1 },
        { endLine: 15, file: "base-a.ts", startLine: 11 },
      ],
      tokens: 20,
    });
    const second = createCloneGroup({
      lines: 5,
      occurrences: [
        { endLine: 5, file: "changed.ts", startLine: 1 },
        { endLine: 25, file: "base-b.ts", startLine: 21 },
      ],
      tokens: 20,
    });

    expect(
      mergeCloneGroups([
        { fingerprint: "b".repeat(64), group: second },
        { fingerprint: "b".repeat(64), group: first },
      ]),
    ).toEqual([
      {
        fingerprint: "b".repeat(64),
        group: {
          lines: 5,
          occurrences: [
            { endLine: 15, file: "base-a.ts", startLine: 11 },
            { endLine: 25, file: "base-b.ts", startLine: 21 },
            { endLine: 5, file: "changed.ts", startLine: 1 },
          ],
          tokens: 20,
        },
      },
    ]);
  });

  test("rejects invalid fingerprints and inconsistent metrics", () => {
    const group = createCloneGroup({
      lines: 1,
      occurrences: [
        { endLine: 1, file: "a.ts", startLine: 1 },
        { endLine: 1, file: "b.ts", startLine: 1 },
      ],
      tokens: 1,
    });
    const different = createCloneGroup({ ...group, tokens: 2 });

    expect(() => mergeCloneGroups([{ fingerprint: "bad", group }])).toThrow(
      /invalid fingerprint/i,
    );
    expect(() =>
      mergeCloneGroups([
        { fingerprint: "a".repeat(64), group },
        { fingerprint: "a".repeat(64), group: different },
      ]),
    ).toThrow(/inconsistent clone metrics/i);
  });
});

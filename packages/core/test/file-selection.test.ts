import { describe, expect, test } from "vitest";

import { selectFiles, splitChangedBaseline } from "../src/files/select-files.js";

describe("selectFiles", () => {
  test("applies include, exclude, extension, and binary filters once", () => {
    const tracked = [
      "README.md",
      "src/app.ts",
      "src/app.test.ts",
      "src/generated/code.ts",
      "src/image.ts",
      "src/lib/util.ts",
      "src/main.kt",
    ];

    expect(
      selectFiles(tracked, {
        binaryPaths: new Set(["src/image.ts"]),
        exclude: ["**/*.test.ts", "src/generated/**"],
        extensions: [".ts"],
        include: ["src/**"],
      }),
    ).toEqual(["src/app.ts", "src/lib/util.ts"]);
  });

  test("normalizes duplicate relative paths and returns deterministic order", () => {
    expect(
      selectFiles(["z.ts", "./a.ts", "a.ts", "src\\windows.ts"], {
        binaryPaths: new Set(),
        exclude: [],
        extensions: [".ts"],
        include: ["**"],
      }),
    ).toEqual(["a.ts", "src\\windows.ts", "z.ts"]);
  });

  test.each(["/absolute.ts", "../escape.ts", "src/../../escape.ts", ""])(
    "rejects an unsafe tracked path: %s",
    (path) => {
      expect(() =>
        selectFiles([path], {
          binaryPaths: new Set(),
          exclude: [],
          extensions: [".ts"],
          include: ["**"],
        }),
      ).toThrow(/unsafe repository path/i);
    },
  );
});

describe("splitChangedBaseline", () => {
  test("splits selected files without allowing unselected changed paths", () => {
    expect(
      splitChangedBaseline(["src/a.ts", "src/b.ts", "src/c.ts"], [
        { path: "src/c.ts", status: "M" },
        { path: "ignored.md", status: "A" },
        { path: "src/a.ts", status: "R", previousPath: "old/a.ts" },
      ]),
    ).toEqual({
      baseline: ["src/b.ts"],
      changed: ["src/a.ts", "src/c.ts"],
    });
  });
});

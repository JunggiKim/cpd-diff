import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { detectWithJscpd } from "../src/jscpd/adapter.js";
import { detectWithPmd } from "../src/pmd/adapter.js";

const executable = new URL("./fixtures/fake-engine.mjs", import.meta.url)
  .pathname;

describe("engine adapters", () => {
  let outputDirectory: string;
  let sourceDirectory: string;

  beforeEach(async () => {
    outputDirectory = path.join(
      process.cwd(),
      "temp-doc",
      "etc",
      "adapter-test",
    );
    sourceDirectory = path.join("temp-doc", "etc", "adapter-source");
    await mkdir(outputDirectory, { recursive: true });
    await mkdir(path.join(sourceDirectory, "src"), { recursive: true });
    await writeFile(
      path.join(sourceDirectory, "src", "a.ts"),
      "const a = 1;\n",
    );
    await writeFile(
      path.join(sourceDirectory, "src", "b.ts"),
      "const b = 2;\n",
    );
    await chmod(executable, 0o755);
  });

  afterEach(async () => {
    await rm(outputDirectory, { recursive: true, force: true });
    await rm(sourceDirectory, { recursive: true, force: true });
  });

  test("executes jscpd without a shell and parses its report", async () => {
    await expect(
      detectWithJscpd({
        executable,
        files: [`${sourceDirectory}/src/b.ts`, `${sourceDirectory}/src/a.ts`],
        language: "typescript",
        minimumLines: 2,
        minimumTokens: 10,
        outputDirectory,
        repositoryRoot: process.cwd(),
        timeoutMilliseconds: 1_000,
      }),
    ).resolves.toEqual([
      {
        lines: 2,
        occurrences: [
          { endLine: 2, file: `${sourceDirectory}/src/a.ts`, startLine: 1 },
          { endLine: 4, file: `${sourceDirectory}/src/b.ts`, startLine: 3 },
        ],
        tokens: 10,
      },
    ]);
  });

  test("executes PMD with fail-closed flags and parses stdout", async () => {
    await expect(
      detectWithPmd({
        executable,
        files: ["src/b.java", "src/a.java"],
        language: "java",
        minimumTokens: 10,
        repositoryRoot: process.cwd(),
        timeoutMilliseconds: 1_000,
      }),
    ).resolves.toEqual([
      {
        lines: 2,
        occurrences: [
          { endLine: 2, file: "src/a.java", startLine: 1 },
          { endLine: 4, file: "src/b.java", startLine: 3 },
        ],
        tokens: 10,
      },
    ]);
  });

  test("returns no clones without executing an engine when fewer than two files exist", async () => {
    await expect(
      detectWithJscpd({
        executable: "/does/not/exist",
        files: ["src/a.ts"],
        language: "typescript",
        minimumLines: 2,
        minimumTokens: 10,
        outputDirectory,
        repositoryRoot: process.cwd(),
        timeoutMilliseconds: 1_000,
      }),
    ).resolves.toEqual([]);
  });
});

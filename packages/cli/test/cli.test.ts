import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { runCli } from "../src/cli.js";

const fakeEngine = new URL(
  "../../engines/test/fixtures/fake-engine.mjs",
  import.meta.url,
).pathname;

describe("runCli", () => {
  let repository: string;
  let stdout: string;
  let stderr: string;

  beforeEach(async () => {
    repository = path.join(
      process.cwd(),
      "temp-doc",
      "etc",
      "cli-test",
      randomUUID(),
    );
    await mkdir(path.join(repository, "src"), { recursive: true });
    git(repository, "init", "-q", "-b", "main");
    git(repository, "config", "user.name", "Test");
    git(repository, "config", "user.email", "test@example.invalid");
    await writeFile(
      path.join(repository, "src", "base.ts"),
      duplicateSource("base"),
    );
    git(repository, "add", ".");
    git(repository, "commit", "-qm", "base");
    await writeFile(
      path.join(repository, "src", "changed.ts"),
      duplicateSource("changed"),
    );
    git(repository, "add", ".");
    git(repository, "commit", "-qm", "head");
    stdout = "";
    stderr = "";
  });

  afterEach(async () => {
    await rm(repository, { recursive: true, force: true });
  });

  test("returns 1 and prints a console violation report", async () => {
    const exitCode = await runCli(baseArguments(), io());
    expect(exitCode).toBe(1);
    expect(stdout).toContain("cpd-diff: 1 new duplication group");
    expect(stdout).toContain("src/changed.ts");
    expect(stderr).toBe("");
  });

  test("returns 0 for warn-only and emits stable JSON", async () => {
    const exitCode = await runCli(
      [...baseArguments(), "--warn-only", "--format", "json"],
      io(),
    );
    const report = JSON.parse(stdout) as {
      schemaVersion: string;
      summary: { violationCount: number };
    };
    expect(exitCode).toBe(0);
    expect(report).toMatchObject({
      schemaVersion: "1.0.0",
      summary: { violationCount: 1 },
    });
    expect(stderr).toBe("");
  });

  test("returns 0 when no selected files can form a clone", async () => {
    const exitCode = await runCli(
      [...baseArguments(), "--include", "docs/**"],
      io(),
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("0 new duplication groups");
  });

  test("returns 2 and a concise error when execution fails", async () => {
    const args = baseArguments();
    args[args.indexOf(fakeEngine)] = "/does/not/exist";
    expect(await runCli(args, io())).toBe(2);
    expect(stderr).toMatch(/cpd-diff execution error/i);
  });

  test("returns 0 and writes help through the provided output boundary", async () => {
    expect(await runCli(["--help"], io())).toBe(0);
    expect(stdout).toContain("Usage: cpd-diff [options]");
    expect(stderr).toBe("");
  });

  function baseArguments(): string[] {
    return [
      "--base",
      "HEAD~1",
      "--head",
      "HEAD",
      "--engine",
      "jscpd",
      "--engine-path",
      fakeEngine,
      "--language",
      "typescript",
      "--minimum-tokens",
      "10",
      "--minimum-lines",
      "2",
      "--mode",
      "changed-lines",
    ];
  }

  function io() {
    return {
      cwd: repository,
      stdout: (text: string) => {
        stdout += text;
      },
      stderr: (text: string) => {
        stderr += text;
      },
    };
  }
});

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function duplicateSource(name: string): string {
  return `export function ${name}(input: number): number {
  const first = input + 1;
  const second = first * 2;
  const third = second - 3;
  return third;
}
`;
}

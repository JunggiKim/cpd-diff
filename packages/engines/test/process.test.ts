import process from "node:process";

import { describe, expect, test } from "vitest";

import { EngineExecutionError, runProcess } from "../src/process/run.js";

describe("runProcess", () => {
  test("passes arguments without a shell and captures bounded output", async () => {
    const result = await runProcess({
      args: [
        "-e",
        "process.stdout.write(JSON.stringify(process.argv.slice(1)))",
        "a b",
        "$(unsafe)",
      ],
      command: process.execPath,
      cwd: process.cwd(),
      maximumOutputBytes: 1024,
      timeoutMilliseconds: 1_000,
    });

    expect(JSON.parse(result.stdout)).toEqual(["a b", "$(unsafe)"]);
    expect(result.stderr).toBe("");
  });

  test("maps a nonzero exit to an explicit error", async () => {
    await expect(
      runProcess({
        args: ["-e", "process.stderr.write('failure'); process.exit(7)"],
        command: process.execPath,
        cwd: process.cwd(),
        maximumOutputBytes: 1024,
        timeoutMilliseconds: 1_000,
      }),
    ).rejects.toMatchObject<Partial<EngineExecutionError>>({
      kind: "nonzero-exit",
      exitCode: 7,
    });
  });

  test("terminates a process after the deadline", async () => {
    await expect(
      runProcess({
        args: ["-e", "setTimeout(() => {}, 10_000)"],
        command: process.execPath,
        cwd: process.cwd(),
        maximumOutputBytes: 1024,
        timeoutMilliseconds: 25,
      }),
    ).rejects.toMatchObject<Partial<EngineExecutionError>>({ kind: "timeout" });
  });

  test("terminates a process whose output exceeds the limit", async () => {
    await expect(
      runProcess({
        args: ["-e", "process.stdout.write('x'.repeat(2048))"],
        command: process.execPath,
        cwd: process.cwd(),
        maximumOutputBytes: 1024,
        timeoutMilliseconds: 1_000,
      }),
    ).rejects.toMatchObject<Partial<EngineExecutionError>>({
      kind: "output-limit",
    });
  });
});

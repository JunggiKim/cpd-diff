import { CommanderError } from "commander";

import { renderConsole, renderJson, renderSarif } from "@cpd-diff/reporters";

import { analyze } from "./analyze.js";
import { parseOptions } from "./options.js";

export type CliIo = Readonly<{
  cwd: string;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}>;

export async function runCli(
  argv: readonly string[],
  io: CliIo,
): Promise<number> {
  try {
    const options = await parseOptions(argv, {
      writeOut: io.stdout,
      writeErr: () => undefined,
    });
    const report = await analyze(options, io.cwd);
    io.stdout(render(report, options.format));
    return report.summary.violationCount > 0 && !options.warnOnly ? 1 : 0;
  } catch (cause) {
    if (cause instanceof CommanderError) {
      if (cause.exitCode === 0) return 0;
      io.stderr(`cpd-diff usage error: ${cause.message}\n`);
      return 2;
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    io.stderr(`cpd-diff execution error: ${message}\n`);
    return 2;
  }
}

function render(
  report: Awaited<ReturnType<typeof analyze>>,
  format: "console" | "json" | "sarif",
): string {
  if (format === "json") return renderJson(report);
  if (format === "sarif") return renderSarif(report);
  return renderConsole(report);
}

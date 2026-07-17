import { Command, InvalidArgumentError, Option } from "commander";

import type { DetectionMode, EngineName } from "@cpd-diff/reporters";

export type OutputFormat = "console" | "json" | "sarif";

export type CliOptions = Readonly<{
  base: string;
  engine: EngineName;
  enginePath: string;
  exclude: string[];
  extension: string[];
  format: OutputFormat;
  head: string;
  include: string[];
  language: string;
  minimumLines: number;
  minimumTokens: number;
  mode: DetectionMode;
  timeoutMilliseconds: number;
  warnOnly: boolean;
}>;

export async function parseOptions(
  argv: readonly string[],
  output: Readonly<{
    writeOut: (text: string) => void;
    writeErr: (text: string) => void;
  }>,
): Promise<CliOptions> {
  const command = new Command()
    .name("cpd-diff")
    .description(
      "Fail only on code duplication introduced by the current change",
    )
    .configureOutput(output)
    .exitOverride()
    .allowUnknownOption(false)
    .option("--base <ref>", "base Git commit", "origin/main")
    .option("--head <ref>", "head Git commit", "HEAD")
    .addOption(
      new Option("--engine <engine>")
        .choices(["jscpd", "pmd"])
        .makeOptionMandatory(),
    )
    .option("--engine-path <path>", "engine executable path")
    .requiredOption("--language <language>", "engine language")
    .option(
      "--minimum-tokens <count>",
      "minimum clone tokens",
      positiveInteger,
      100,
    )
    .option(
      "--minimum-lines <count>",
      "minimum clone lines for jscpd",
      positiveInteger,
      5,
    )
    .addOption(
      new Option("--mode <mode>")
        .choices(["changed-files", "changed-lines"])
        .default("changed-files"),
    )
    .addOption(
      new Option("--format <format>")
        .choices(["console", "json", "sarif"])
        .default("console"),
    )
    .option("--include <glob>", "include glob; repeatable", collect, [])
    .option("--exclude <glob>", "exclude glob; repeatable", collect, [])
    .option(
      "--extension <extension>",
      "language extension; repeatable",
      collect,
      [],
    )
    .option(
      "--timeout <milliseconds>",
      "engine timeout",
      positiveInteger,
      120_000,
    )
    .option("--warn-only", "report violations without exit 1", false);
  await command.parseAsync([...argv], { from: "user" });
  const raw = command.opts();
  const engine = raw.engine as EngineName;
  return {
    base: raw.base as string,
    engine,
    enginePath: (raw.enginePath as string | undefined) ?? engine,
    exclude: raw.exclude as string[],
    extension: raw.extension as string[],
    format: raw.format as OutputFormat,
    head: raw.head as string,
    include: raw.include as string[],
    language: raw.language as string,
    minimumLines: raw.minimumLines as number,
    minimumTokens: raw.minimumTokens as number,
    mode: raw.mode as DetectionMode,
    timeoutMilliseconds: raw.timeout as number,
    warnOnly: raw.warnOnly as boolean,
  };
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new InvalidArgumentError("must be a positive integer");
  return parsed;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

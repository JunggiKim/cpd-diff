#!/usr/bin/env node
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args[0] === "cpd") {
  process.stdout.write(`<?xml version="1.0" encoding="UTF-8"?>
<pmd-cpd xmlns="https://pmd-code.org/schema/cpd-report">
  <duplication lines="2" tokens="10">
    <file line="1" endline="2" path="${path.join(process.cwd(), "src/a.java")}"/>
    <file line="3" endline="4" path="${path.join(process.cwd(), "src/b.java")}"/>
  </duplication>
</pmd-cpd>`);
  process.exit(0);
}

const outputIndex = args.indexOf("--output");
if (outputIndex < 0 || args[outputIndex + 1] === undefined) process.exit(2);
const output = args[outputIndex + 1];
const files = readdirSync(process.cwd(), {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile())
  .map((entry) => path.join(entry.parentPath, entry.name))
  .map((file) => path.relative(process.cwd(), file).split(path.sep).join("/"))
  .sort();
if (files.length < 2) process.exit(2);
mkdirSync(output, { recursive: true });
writeFileSync(
  path.join(output, "jscpd-report.json"),
  JSON.stringify({
    duplicates: [
      {
        firstFile: { start: 1, end: 2, name: files[0] },
        secondFile: { start: 3, end: 4, name: files[1] },
        lines: 2,
        tokens: 10,
      },
    ],
  }),
);

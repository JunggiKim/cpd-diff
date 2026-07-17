import { createCloneGroup } from "@cpd-diff/core";
import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import { createReportDocument } from "../src/document.js";
import { renderConsole } from "../src/console.js";
import { renderJson } from "../src/json.js";

const report = createReportDocument({
  base: "origin/main",
  changedPaths: new Set(["src/a.ts"]),
  engine: "jscpd",
  groups: [
    {
      fingerprint: "a".repeat(64),
      group: createCloneGroup({
        lines: 5,
        occurrences: [
          { endLine: 5, file: "src/a.ts", startLine: 1 },
          { endLine: 14, file: "src/b.ts", startLine: 10 },
        ],
        tokens: 20,
      }),
    },
  ],
  head: "HEAD",
  mode: "changed-lines",
  toolVersion: "1.0.0",
});

describe("createReportDocument", () => {
  test("creates a stable engine-independent JSON schema", () => {
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["schemaVersion", "tool", "analysis", "summary", "violations"],
      properties: {
        schemaVersion: { const: "1.0.0" },
        tool: {
          type: "object",
          additionalProperties: false,
          required: ["name", "version"],
          properties: {
            name: { const: "cpd-diff" },
            version: { type: "string" },
          },
        },
        analysis: {
          type: "object",
          additionalProperties: false,
          required: ["base", "head", "engine", "mode"],
          properties: {
            base: { type: "string" },
            head: { type: "string" },
            engine: { enum: ["jscpd", "pmd"] },
            mode: { enum: ["changed-files", "changed-lines"] },
          },
        },
        summary: {
          type: "object",
          additionalProperties: false,
          required: ["occurrenceCount", "violationCount"],
          properties: {
            occurrenceCount: { type: "integer", minimum: 0 },
            violationCount: { type: "integer", minimum: 0 },
          },
        },
        violations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["fingerprint", "lines", "tokens", "occurrences"],
            properties: {
              fingerprint: { type: "string", pattern: "^[a-f0-9]{64}$" },
              lines: { type: "integer", minimum: 1 },
              tokens: { type: "integer", minimum: 1 },
              occurrences: {
                type: "array",
                minItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["file", "startLine", "endLine", "isChanged"],
                  properties: {
                    file: { type: "string", minLength: 1 },
                    startLine: { type: "integer", minimum: 1 },
                    endLine: { type: "integer", minimum: 1 },
                    isChanged: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    } as const;

    expect(new Ajv({ strict: true }).validate(schema, report)).toBe(true);
    expect(report.summary).toEqual({ occurrenceCount: 2, violationCount: 1 });
  });

  test("renders deterministic JSON with a trailing newline", () => {
    expect(renderJson(report)).toBe(`${JSON.stringify(report, null, 2)}\n`);
  });

  test("renders a concise readable console report", () => {
    expect(renderConsole(report))
      .toBe(`cpd-diff: 1 new duplication group (changed-lines, jscpd)

1. 5 lines, 20 tokens
   src/a.ts:1-5 [changed]
   src/b.ts:10-14

Compared origin/main...HEAD. Found 2 occurrences.
`);
  });
});

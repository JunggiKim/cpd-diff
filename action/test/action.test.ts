import { describe, expect, test } from "vitest";

import { assertSafeEvent, parseList, resolveBase } from "../src/config.js";

describe("GitHub Action configuration", () => {
  test("uses an explicit base before pull request metadata", () => {
    expect(resolveBase("abc123", { pull_request: { base: { sha: "base-sha" } } })).toBe("abc123");
  });

  test("uses the immutable pull request base SHA", () => {
    expect(resolveBase("", { pull_request: { base: { sha: "base-sha" } } })).toBe("base-sha");
  });

  test("requires a base outside pull requests", () => {
    expect(() => resolveBase("", {})).toThrow(/base/i);
  });

  test("rejects pull_request_target because it can expose privileged context", () => {
    expect(() => assertSafeEvent("pull_request_target")).toThrow(/pull_request_target/);
  });

  test("parses newline-delimited patterns", () => {
    expect(parseList("src/**\n\n test/** ")).toEqual(["src/**", "test/**"]);
  });
});

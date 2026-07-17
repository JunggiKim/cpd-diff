import { describe, expect, test } from "vitest";

import { VERSION } from "../src/index.js";

describe("@cpd-diff/core package contract", () => {
  test("exposes the development version", () => {
    expect(VERSION).toBe("0.0.0");
  });
});

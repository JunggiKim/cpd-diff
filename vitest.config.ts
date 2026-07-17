import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

function source(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@cpd-diff/core": source("./packages/core/src/index.ts"),
      "@cpd-diff/engines": source("./packages/engines/src/index.ts"),
      "@cpd-diff/reporters": source("./packages/reporters/src/index.ts"),
      "cpd-diff": source("./packages/cli/src/index.ts"),
    },
  },
});

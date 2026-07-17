import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ENGINE_RELEASES } from "../src/install/releases.js";
import { installEngine, validateArchiveEntries } from "../src/install/manager.js";

describe("engine release manifests", () => {
  test("pins upstream versions, URLs, and GitHub-provided SHA-256 digests", () => {
    expect(ENGINE_RELEASES.pmd).toMatchObject({
      version: "7.26.0",
      artifactName: "pmd-dist-7.26.0-bin.zip",
      sha256: "9f55cb7ff0e9f9a66dd2f005eaa370e84c8a4cd971b134aa14a930c4a283ebc9",
    });
    expect(ENGINE_RELEASES.jscpd["darwin-arm64"]).toMatchObject({
      version: "5.0.12",
      artifactName: "jscpd-darwin-arm64.tar.gz",
      sha256: "e4d8add23658938cb553c3cd8945d1163c206e36732e0cd742c511aad43c33c8",
    });
    expect(Object.keys(ENGINE_RELEASES.jscpd).sort()).toEqual([
      "darwin-arm64",
      "darwin-x64",
      "linux-arm64",
      "linux-x64",
      "win32-x64",
    ]);
  });
});

describe("installEngine", () => {
  let root: string;
  let server: Server | undefined;

  beforeEach(async () => {
    server = undefined;
    root = path.join(process.cwd(), "temp-doc", "etc", "manager-test", randomUUID());
    await mkdir(path.join(root, "archive"), { recursive: true });
    await writeFile(path.join(root, "archive", "engine"), "#!/bin/sh\necho engine\n");
    await chmod(path.join(root, "archive", "engine"), 0o755);
    execFileSync("tar", ["-czf", path.join(root, "engine.tar.gz"), "-C", path.join(root, "archive"), "engine"]);
  });

  afterEach(async () => {
    if (server !== undefined) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
      server = undefined;
    }
    await rm(root, { recursive: true, force: true });
  });

  test("downloads, validates entries, extracts, and reuses a pinned artifact", async () => {
    const archive = await readFile(path.join(root, "engine.tar.gz"));
    server = createServer((_request, response) => response.end(archive));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Test server did not bind");
    const origin = `http://127.0.0.1:${address.port}`;
    const specification = {
      archiveFormat: "tar.gz" as const,
      artifactName: "engine.tar.gz",
      cacheDirectory: path.join(root, "cache"),
      executableRelativePath: "engine",
      sha256: createHash("sha256").update(archive).digest("hex"),
      trustedOrigins: new Set([origin]),
      url: new URL("/engine.tar.gz", origin),
      version: "1.0.0",
    };

    const first = await installEngine(specification);
    const second = await installEngine(specification);
    expect(first).toBe(second);
    expect(await readFile(first, "utf8")).toContain("echo engine");
  });

  test.each(["../escape", "/absolute", "safe/../../escape", "C:\\escape.exe", "safe\\escape"])(
    "rejects an unsafe archive entry: %s",
    (entry) => {
      expect(() => validateArchiveEntries([entry])).toThrow(/unsafe archive entry/i);
    },
  );
});

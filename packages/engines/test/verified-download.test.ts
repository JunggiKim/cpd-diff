import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { downloadVerifiedArtifact } from "../src/install/verified-download.js";

const artifact = Buffer.from("verified engine artifact");
const checksum = createHash("sha256").update(artifact).digest("hex");

describe("downloadVerifiedArtifact", () => {
  let cacheDirectory: string;
  let origin: string;
  let requests: number;
  let server: Server;

  beforeEach(async () => {
    cacheDirectory = path.join(
      process.cwd(),
      "temp-doc",
      "etc",
      "installer-test",
      randomUUID(),
    );
    await mkdir(cacheDirectory, { recursive: true });
    requests = 0;
    server = createServer((_request, response) => {
      requests += 1;
      response.writeHead(200, { "content-type": "application/octet-stream" });
      response.end(artifact);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Test server did not bind");
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      ),
    );
    await rm(cacheDirectory, { recursive: true, force: true });
  });

  test("downloads once, verifies SHA-256, and reuses a verified regular cache file", async () => {
    const specification = {
      artifactName: "engine.tar.gz",
      cacheDirectory,
      sha256: checksum,
      trustedOrigins: new Set([origin]),
      url: new URL("/engine.tar.gz", origin),
    };

    const first = await downloadVerifiedArtifact(specification);
    const second = await downloadVerifiedArtifact(specification);

    expect(first).toBe(second);
    expect(await readFile(first)).toEqual(artifact);
    expect(requests).toBe(1);
  });

  test("fails closed and leaves no artifact when the checksum differs", async () => {
    await expect(
      downloadVerifiedArtifact({
        artifactName: "engine.tar.gz",
        cacheDirectory,
        sha256: "0".repeat(64),
        trustedOrigins: new Set([origin]),
        url: new URL("/engine.tar.gz", origin),
      }),
    ).rejects.toThrow(/checksum mismatch/i);

    expect(await readdir(cacheDirectory)).toEqual([]);
  });

  test("rejects an origin outside the explicit allowlist before network access", async () => {
    await expect(
      downloadVerifiedArtifact({
        artifactName: "engine.tar.gz",
        cacheDirectory,
        sha256: checksum,
        trustedOrigins: new Set(["https://github.com"]),
        url: new URL("/engine.tar.gz", origin),
      }),
    ).rejects.toThrow(/untrusted artifact origin/i);
    expect(requests).toBe(0);
  });

  test("replaces a corrupt regular cache file after verification", async () => {
    await writeFile(path.join(cacheDirectory, "engine.tar.gz"), "corrupt");

    const result = await downloadVerifiedArtifact({
      artifactName: "engine.tar.gz",
      cacheDirectory,
      sha256: checksum,
      trustedOrigins: new Set([origin]),
      url: new URL("/engine.tar.gz", origin),
    });

    expect(await readFile(result)).toEqual(artifact);
    expect(requests).toBe(1);
  });
});

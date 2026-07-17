import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export type ArtifactSpecification = Readonly<{
  artifactName: string;
  cacheDirectory: string;
  sha256: string;
  trustedOrigins: ReadonlySet<string>;
  url: URL;
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ARTIFACT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const MAXIMUM_ARTIFACT_BYTES = 512 * 1024 * 1024;
const MAXIMUM_REDIRECTS = 5;
const DOWNLOAD_TIMEOUT_MILLISECONDS = 120_000;

export async function downloadVerifiedArtifact(
  specification: ArtifactSpecification,
): Promise<string> {
  validateSpecification(specification);
  await mkdir(specification.cacheDirectory, { recursive: true, mode: 0o700 });

  const destination = path.join(
    specification.cacheDirectory,
    specification.artifactName,
  );
  if (await isVerifiedRegularFile(destination, specification.sha256))
    return destination;
  await removeExistingPath(destination);

  const artifact = await download(specification);
  verifyChecksum(artifact, specification.sha256);
  await writeAtomically(destination, artifact);
  return destination;
}

function validateSpecification(specification: ArtifactSpecification): void {
  if (!ARTIFACT_NAME_PATTERN.test(specification.artifactName)) {
    throw new Error("Invalid artifact name");
  }
  if (!SHA256_PATTERN.test(specification.sha256))
    throw new Error("Invalid SHA-256 checksum");
  if (specification.url.username !== "" || specification.url.password !== "") {
    throw new Error("Artifact URL credentials are forbidden");
  }
  if (!specification.trustedOrigins.has(specification.url.origin)) {
    throw new Error(`Untrusted artifact origin: ${specification.url.origin}`);
  }
}

async function isVerifiedRegularFile(
  file: string,
  expectedChecksum: string,
): Promise<boolean> {
  try {
    const status = await lstat(file);
    if (!status.isFile() || status.isSymbolicLink()) return false;
    return checksum(await readFile(file)) === expectedChecksum;
  } catch (cause) {
    if (isFileNotFound(cause)) return false;
    throw cause;
  }
}

async function removeExistingPath(file: string): Promise<void> {
  try {
    await unlink(file);
  } catch (cause) {
    if (!isFileNotFound(cause)) throw cause;
  }
}

async function download(
  specification: ArtifactSpecification,
): Promise<Uint8Array> {
  const response = await fetchTrusted(specification);
  if (!response.ok)
    throw new Error(`Artifact download failed with HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAXIMUM_ARTIFACT_BYTES
  ) {
    throw new Error("Artifact exceeds maximum download size");
  }
  return await readBoundedBody(response);
}

async function fetchTrusted(
  specification: ArtifactSpecification,
): Promise<Response> {
  let url = specification.url;
  for (let redirects = 0; redirects <= MAXIMUM_REDIRECTS; redirects += 1) {
    if (!specification.trustedOrigins.has(url.origin)) {
      throw new Error(`Untrusted artifact redirect origin: ${url.origin}`);
    }
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MILLISECONDS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (location === null) throw new Error("Artifact redirect has no location");
    url = new URL(location, url);
  }
  throw new Error("Artifact exceeded maximum redirects");
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  if (response.body === null) throw new Error("Artifact response has no body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAXIMUM_ARTIFACT_BYTES) {
      await reader.cancel();
      throw new Error("Artifact exceeds maximum download size");
    }
    chunks.push(value);
  }
  const artifact = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    artifact.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return artifact;
}

function verifyChecksum(artifact: Uint8Array, expected: string): void {
  if (checksum(artifact) !== expected)
    throw new Error("Artifact checksum mismatch");
}

function checksum(artifact: Uint8Array): string {
  return createHash("sha256").update(artifact).digest("hex");
}

async function writeAtomically(
  destination: string,
  artifact: Uint8Array,
): Promise<void> {
  const temporary = `${destination}.partial-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, artifact, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
  } finally {
    await removePartialDownload(temporary);
  }
}

async function removePartialDownload(file: string): Promise<void> {
  try {
    await unlink(file);
  } catch {
    // Best-effort cleanup must not replace the download or rename error.
  }
}

function isFileNotFound(cause: unknown): boolean {
  return cause instanceof Error && "code" in cause && cause.code === "ENOENT";
}

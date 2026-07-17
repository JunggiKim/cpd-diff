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
  const response = await fetch(specification.url, { redirect: "follow" });
  if (!response.ok)
    throw new Error(`Artifact download failed with HTTP ${response.status}`);
  if (!specification.trustedOrigins.has(new URL(response.url).origin)) {
    throw new Error(
      `Untrusted artifact redirect origin: ${new URL(response.url).origin}`,
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAXIMUM_ARTIFACT_BYTES
  ) {
    throw new Error("Artifact exceeds maximum download size");
  }
  const artifact = new Uint8Array(await response.arrayBuffer());
  if (artifact.byteLength > MAXIMUM_ARTIFACT_BYTES) {
    throw new Error("Artifact exceeds maximum download size");
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

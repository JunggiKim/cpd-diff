import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { runProcess } from "../process/run.js";
import { downloadVerifiedArtifact } from "./verified-download.js";
import { releaseFor, type EngineRelease } from "./releases.js";

export type EngineInstallSpecification = EngineRelease & Readonly<{ cacheDirectory: string }>;

export async function resolveEngine(
  engine: "jscpd" | "pmd",
  cacheDirectory: string,
): Promise<string> {
  return await installEngine({ ...releaseFor(engine), cacheDirectory });
}

export async function installEngine(specification: EngineInstallSpecification): Promise<string> {
  validateArchiveEntries([specification.executableRelativePath]);
  const installDirectory = path.join(
    specification.cacheDirectory,
    `${specification.version}-${specification.sha256.slice(0, 16)}`,
  );
  const executable = path.join(installDirectory, specification.executableRelativePath);
  if (await isCompleteInstall(installDirectory, executable, specification.sha256)) return executable;

  const archive = await downloadVerifiedArtifact(specification);
  const temporary = `${installDirectory}.partial-${randomUUID()}`;
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  try {
    const entries = await listArchive(archive, specification.archiveFormat, specification.cacheDirectory);
    validateArchiveEntries(entries);
    await extractArchive(archive, specification.archiveFormat, temporary);
    const extractedExecutable = path.join(temporary, specification.executableRelativePath);
    const status = await lstat(extractedExecutable);
    if (!status.isFile() || status.isSymbolicLink()) throw new Error("Engine executable is not a regular file");
    await chmod(extractedExecutable, 0o755);
    await writeFile(path.join(temporary, ".complete"), `${specification.sha256}\n`, { mode: 0o600 });
    await rm(installDirectory, { recursive: true, force: true });
    await rename(temporary, installDirectory);
    return executable;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export function validateArchiveEntries(entries: readonly string[]): void {
  if (entries.length === 0) throw new Error("Archive has no entries");
  for (const rawEntry of entries) {
    const entry = rawEntry.replace(/^\.\//u, "");
    if (
      entry.length === 0 ||
      entry.includes("\\") ||
      entry.includes("\0") ||
      path.posix.isAbsolute(entry) ||
      /^[A-Za-z]:/u.test(entry)
    ) {
      throw new Error(`Unsafe archive entry: ${JSON.stringify(rawEntry)}`);
    }
    const normalized = path.posix.normalize(entry);
    if (normalized === ".." || normalized.startsWith("../")) {
      throw new Error(`Unsafe archive entry: ${JSON.stringify(rawEntry)}`);
    }
  }
}

async function listArchive(
  archive: string,
  format: EngineRelease["archiveFormat"],
  cwd: string,
): Promise<string[]> {
  const { stdout } = await runProcess({
    args: format === "tar.gz" ? ["-tzf", archive] : ["-tf", archive],
    command: "tar",
    cwd,
    maximumOutputBytes: 16 * 1024 * 1024,
    timeoutMilliseconds: 60_000,
  });
  return stdout.split(/\r?\n/u).filter((entry) => entry.length > 0);
}

async function extractArchive(
  archive: string,
  format: EngineRelease["archiveFormat"],
  destination: string,
): Promise<void> {
  await runProcess({
    args: format === "tar.gz" ? ["-xzf", archive, "-C", destination] : ["-xf", archive, "-C", destination],
    command: "tar",
    cwd: destination,
    maximumOutputBytes: 1024 * 1024,
    timeoutMilliseconds: 120_000,
  });
}

async function isCompleteInstall(
  installDirectory: string,
  executable: string,
  checksum: string,
): Promise<boolean> {
  try {
    const [status, marker] = await Promise.all([
      lstat(executable),
      readFile(path.join(installDirectory, ".complete"), "utf8"),
    ]);
    return status.isFile() && !status.isSymbolicLink() && marker.trim() === checksum;
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return false;
    throw cause;
  }
}

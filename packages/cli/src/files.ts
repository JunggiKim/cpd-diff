import { open, lstat } from "node:fs/promises";
import path from "node:path";

export async function unsupportedFiles(
  repositoryRoot: string,
  files: readonly string[],
): Promise<Set<string>> {
  const results = await Promise.all(
    files.map(async (file) => ((await isRegularTextFile(path.join(repositoryRoot, file))) ? undefined : file)),
  );
  return new Set(results.filter((file): file is string => file !== undefined));
}

async function isRegularTextFile(file: string): Promise<boolean> {
  const status = await lstat(file);
  if (!status.isFile() || status.isSymbolicLink()) return false;
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, 0);
    return !buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

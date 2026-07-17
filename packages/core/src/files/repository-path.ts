import path from "node:path";

export function normalizeRepositoryPath(candidate: string): string {
  if (candidate.length === 0 || candidate.includes("\0") || path.posix.isAbsolute(candidate)) {
    throw unsafeRepositoryPath(candidate);
  }

  const normalized = path.posix.normalize(candidate);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw unsafeRepositoryPath(candidate);
  }
  return normalized;
}

function unsafeRepositoryPath(candidate: string): Error {
  return new Error(`Unsafe repository path: ${JSON.stringify(candidate)}`);
}

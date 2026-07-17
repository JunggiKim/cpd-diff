import path from "node:path";

import { normalizeRepositoryPath } from "@cpd-diff/core";

export function normalizeReportedPath(candidate: string, repositoryRoot: string): string {
  if (candidate.length === 0 || candidate.includes("\0")) throw new Error("Invalid reported path");
  const absolute = path.resolve(repositoryRoot, candidate);
  const relative = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
  return normalizeRepositoryPath(relative);
}

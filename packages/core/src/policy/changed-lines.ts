import type { CloneGroup } from "../clones/clone-group.js";
import { normalizeRepositoryPath } from "../files/repository-path.js";
import type { LineRange } from "../git/changed-lines.js";

export function filterChangedLineGroups(
  groups: readonly CloneGroup[],
  changedLines: ReadonlyMap<string, readonly LineRange[]>,
): CloneGroup[] {
  const rangesByFile = normalizeChangedLines(changedLines);
  return groups.filter((group) =>
    group.occurrences.some((occurrence) => {
      const ranges = rangesByFile.get(occurrence.file) ?? [];
      return ranges.some(
        (range) => occurrence.startLine <= range.endLine && range.startLine <= occurrence.endLine,
      );
    }),
  );
}

function normalizeChangedLines(
  changedLines: ReadonlyMap<string, readonly LineRange[]>,
): Map<string, readonly LineRange[]> {
  const normalized = new Map<string, LineRange[]>();
  try {
    for (const [candidate, ranges] of changedLines) {
      const file = normalizeRepositoryPath(candidate);
      const existing = normalized.get(file) ?? [];
      for (const range of ranges) {
        if (!isValidRange(range)) throw invalidChangedLines();
        existing.push(Object.freeze({ startLine: range.startLine, endLine: range.endLine }));
      }
      existing.sort((left, right) => left.startLine - right.startLine || left.endLine - right.endLine);
      normalized.set(file, existing);
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message === "Invalid changed line ranges") throw cause;
    throw new Error("Invalid changed line ranges", { cause });
  }
  return normalized;
}

function isValidRange(range: LineRange): boolean {
  return (
    Number.isSafeInteger(range.startLine) &&
    Number.isSafeInteger(range.endLine) &&
    range.startLine > 0 &&
    range.endLine >= range.startLine
  );
}

function invalidChangedLines(): Error {
  return new Error("Invalid changed line ranges");
}

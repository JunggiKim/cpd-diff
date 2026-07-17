import { normalizeRepositoryPath } from "../files/repository-path.js";

export type CloneOccurrence = Readonly<{
  endLine: number;
  file: string;
  startLine: number;
}>;

export type CloneGroup = Readonly<{
  lines: number;
  occurrences: readonly CloneOccurrence[];
  tokens: number;
}>;

export function createCloneGroup(input: CloneGroup): CloneGroup {
  if (!isPositiveInteger(input.lines) || !isPositiveInteger(input.tokens)) {
    throw invalidCloneGroup();
  }
  if (!Array.isArray(input.occurrences) || input.occurrences.length < 2) {
    throw invalidCloneGroup();
  }

  const occurrences = input.occurrences.map((occurrence) => {
    if (!isPositiveInteger(occurrence.startLine) || !isPositiveInteger(occurrence.endLine)) {
      throw invalidCloneGroup();
    }
    if (occurrence.endLine < occurrence.startLine) throw invalidCloneGroup();
    try {
      return Object.freeze({
        endLine: occurrence.endLine,
        file: normalizeRepositoryPath(occurrence.file),
        startLine: occurrence.startLine,
      });
    } catch (cause) {
      throw new Error("Invalid clone group", { cause });
    }
  });

  return Object.freeze({
    lines: input.lines,
    occurrences: Object.freeze(occurrences),
    tokens: input.tokens,
  });
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function invalidCloneGroup(): Error {
  return new Error("Invalid clone group");
}

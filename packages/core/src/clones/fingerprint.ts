import { createHash } from "node:crypto";

import {
  createCloneGroup,
  type CloneGroup,
  type CloneOccurrence,
} from "./clone-group.js";

export type FingerprintedCloneGroup = Readonly<{
  fingerprint: string;
  group: CloneGroup;
}>;

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;

export function fingerprintFragment(fragment: string): string {
  const normalized = fragment.replace(/\r\n?/gu, "\n").trim();
  if (normalized.length === 0) throw new Error("Empty clone fragment");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function mergeCloneGroups(
  entries: readonly FingerprintedCloneGroup[],
): FingerprintedCloneGroup[] {
  const merged = new Map<string, CloneGroup>();

  for (const entry of entries) {
    if (!FINGERPRINT_PATTERN.test(entry.fingerprint))
      throw new Error("Invalid fingerprint");
    const existing = merged.get(entry.fingerprint);
    if (existing === undefined) {
      merged.set(entry.fingerprint, entry.group);
      continue;
    }
    if (
      existing.lines !== entry.group.lines ||
      existing.tokens !== entry.group.tokens
    ) {
      throw new Error("Inconsistent clone metrics for fingerprint");
    }
    merged.set(entry.fingerprint, mergeOccurrences(existing, entry.group));
  }

  return [...merged.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([fingerprint, group]) => Object.freeze({ fingerprint, group }));
}

function mergeOccurrences(left: CloneGroup, right: CloneGroup): CloneGroup {
  const occurrences = new Map<string, CloneOccurrence>();
  for (const occurrence of [...left.occurrences, ...right.occurrences]) {
    occurrences.set(occurrenceKey(occurrence), occurrence);
  }
  return createCloneGroup({
    lines: left.lines,
    occurrences: [...occurrences.values()].sort(compareOccurrences),
    tokens: left.tokens,
  });
}

function occurrenceKey(occurrence: CloneOccurrence): string {
  return `${occurrence.file}\0${occurrence.startLine}\0${occurrence.endLine}`;
}

function compareOccurrences(
  left: CloneOccurrence,
  right: CloneOccurrence,
): number {
  return (
    compareText(left.file, right.file) ||
    left.startLine - right.startLine ||
    left.endLine - right.endLine
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

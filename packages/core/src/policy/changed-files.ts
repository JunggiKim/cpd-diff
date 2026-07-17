import type { CloneGroup } from "../clones/clone-group.js";
import { normalizeRepositoryPath } from "../files/repository-path.js";

export function filterChangedFileGroups(
  groups: readonly CloneGroup[],
  changedPaths: ReadonlySet<string>,
): CloneGroup[] {
  const changed = new Set([...changedPaths].map(normalizeRepositoryPath));
  return groups.filter((group) =>
    group.occurrences.some(({ file }) =>
      changed.has(normalizeRepositoryPath(file)),
    ),
  );
}

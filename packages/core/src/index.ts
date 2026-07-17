export const VERSION = "0.0.0";

export { parseNameStatusZ } from "./git/changed-files.js";
export type { ChangedFile, ChangedFileStatus } from "./git/changed-files.js";
export { parseUnifiedZeroContext } from "./git/changed-lines.js";
export type { LineRange } from "./git/changed-lines.js";
export { createCloneGroup } from "./clones/clone-group.js";
export type { CloneGroup, CloneOccurrence } from "./clones/clone-group.js";
export { fingerprintFragment, mergeCloneGroups } from "./clones/fingerprint.js";
export type { FingerprintedCloneGroup } from "./clones/fingerprint.js";
export { selectFiles, splitChangedBaseline } from "./files/select-files.js";
export type { ChangedBaselineSplit, FileSelectionOptions } from "./files/select-files.js";
export { normalizeRepositoryPath } from "./files/repository-path.js";
export { filterChangedFileGroups } from "./policy/changed-files.js";
export { filterChangedLineGroups } from "./policy/changed-lines.js";

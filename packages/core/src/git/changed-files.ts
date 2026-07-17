export type ChangedFileStatus = "A" | "C" | "M" | "R";

export type ChangedFile = Readonly<{
  path: string;
  previousPath?: string;
  status: ChangedFileStatus;
}>;

const STATUS_PATTERN = /^([ACMRD])(?:\d{1,3})?$/;
type RawStatus = ChangedFileStatus | "D";

export function parseNameStatusZ(output: Uint8Array): ChangedFile[] {
  if (output.byteLength === 0) return [];
  if (output.at(-1) !== 0) throw invalidNameStatus();

  const fields = decodeFields(output.subarray(0, -1));
  const files: ChangedFile[] = [];

  for (let index = 0; index < fields.length; ) {
    const status = parseStatus(fields[index]);
    if (status === "C" || status === "R") {
      const previousPath = requiredPath(fields[index + 1]);
      const path = requiredPath(fields[index + 2]);
      files.push({ path, previousPath, status });
      index += 3;
      continue;
    }

    const path = requiredPath(fields[index + 1]);
    if (status !== "D") files.push({ path, status });
    index += 2;
  }

  return files;
}

function parseStatus(field: string | undefined): RawStatus {
  const status = field?.match(STATUS_PATTERN)?.[1];
  if (status === "A" || status === "C" || status === "M" || status === "R" || status === "D") {
    return status;
  }
  throw invalidNameStatus();
}

function decodeFields(output: Uint8Array): string[] {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(output).split("\0");
  } catch {
    throw invalidNameStatus();
  }
}

function requiredPath(path: string | undefined): string {
  if (path === undefined || path.length === 0) throw invalidNameStatus();
  return path;
}

function invalidNameStatus(): Error {
  return new Error("Invalid git name-status output");
}

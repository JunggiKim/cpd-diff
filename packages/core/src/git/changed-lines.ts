export type LineRange = Readonly<{
  endLine: number;
  startLine: number;
}>;

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@(?:.*)$/;

export function parseUnifiedZeroContext(diff: string): LineRange[] {
  const ranges: LineRange[] = [];

  for (const line of diff.split(/\r?\n/u)) {
    if (!line.startsWith("@@")) continue;

    const match = line.match(HUNK_HEADER);
    if (match === null) throw invalidUnifiedDiff();

    const startLine = Number(match[1]);
    const lineCount = match[2] === undefined ? 1 : Number(match[2]);
    if (!Number.isSafeInteger(startLine) || !Number.isSafeInteger(lineCount)) {
      throw invalidUnifiedDiff();
    }
    if (lineCount === 0) continue;
    if (startLine < 1 || lineCount < 1) throw invalidUnifiedDiff();

    appendMerged(ranges, { startLine, endLine: startLine + lineCount - 1 });
  }

  return ranges;
}

function appendMerged(ranges: LineRange[], current: LineRange): void {
  const previous = ranges.at(-1);
  if (previous === undefined || current.startLine > previous.endLine + 1) {
    ranges.push(current);
    return;
  }

  ranges[ranges.length - 1] = {
    startLine: previous.startLine,
    endLine: Math.max(previous.endLine, current.endLine),
  };
}

function invalidUnifiedDiff(): Error {
  return new Error("Invalid git unified diff output");
}

import type { ReportDocument, ReportOccurrence } from "./document.js";

export function renderConsole(report: ReportDocument): string {
  const groupLabel = report.summary.violationCount === 1 ? "group" : "groups";
  const lines = [
    `cpd-diff: ${report.summary.violationCount} new duplication ${groupLabel} (${report.analysis.mode}, ${report.analysis.engine})`,
    "",
  ];
  report.violations.forEach((violation, index) => {
    lines.push(`${index + 1}. ${violation.lines} lines, ${violation.tokens} tokens`);
    lines.push(...violation.occurrences.map(renderOccurrence));
    lines.push("");
  });
  lines.push(
    `Compared ${report.analysis.base}...${report.analysis.head}. Found ${report.summary.occurrenceCount} occurrences.`,
    "",
  );
  return lines.join("\n");
}

function renderOccurrence(occurrence: ReportOccurrence): string {
  const changed = occurrence.isChanged ? " [changed]" : "";
  return `   ${occurrence.file}:${occurrence.startLine}-${occurrence.endLine}${changed}`;
}

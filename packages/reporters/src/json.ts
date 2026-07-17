import type { ReportDocument } from "./document.js";

export function renderJson(report: ReportDocument): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

import { csvEscape } from "@/lib/utils/text";
import { formatDuration, formatShortDate } from "@/lib/utils/date";
import type { Project, ReportLanguage, WorkLog } from "@/types/domain";

export function exportLogsToCsv(logs: WorkLog[], projects: Project[], language: ReportLanguage): void {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const header = ["Data", "Budowa", "Klient", "Start", "Koniec", "Minuty", "Opis"];
  const rows = logs.map((log) => {
    const project = projectById.get(log.projectId);
    const description = language === "nl" ? log.descriptionNL || log.descriptionPL : log.descriptionPL;
    return [
      log.dateKey,
      project?.name ?? "",
      project?.client ?? "",
      log.startTime,
      log.endTime,
      log.durationMinutes,
      description,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "remmark-raport.csv");
}

export function exportLogsToPdf(
  logs: WorkLog[],
  projects: Project[],
  rangeLabel: string,
  language: ReportLanguage,
): void {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const lines = [
    "Remmark",
    `Raport: ${rangeLabel}`,
    `Lacznie: ${formatDuration(totalMinutes)}`,
    "",
  ];

  logs.forEach((log) => {
    const project = projectById.get(log.projectId);
    const date = log.date?.toDate ? formatShortDate(log.date.toDate()) : log.dateKey;
    const description = language === "nl" ? log.descriptionNL || log.descriptionPL : log.descriptionPL;
    lines.push(`${project?.name ?? "Bez nazwy"} - ${project?.client ?? ""}`);
    lines.push(`${date}   ${log.startTime}-${log.endTime}   ${formatDuration(log.durationMinutes)}`);
    wrapText(description || "-", 92).forEach((line) => lines.push(line));
    lines.push("");
  });

  const pdf = buildSimplePdf(lines);
  downloadBlob(new Blob([pdf], { type: "application/pdf" }), "remmark-raport.pdf");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function wrapText(text: string, maxLength: number): string[] {
  const normalized = stripDiacritics(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}

function buildSimplePdf(lines: string[]): ArrayBuffer {
  const pageLineLimit = 46;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageLineLimit) {
    pages.push(lines.slice(index, index + pageLineLimit));
  }

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(createContentStream(pageLines, pageIndex));
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const encoded = new TextEncoder().encode(chunks.join(""));
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

function createContentStream(lines: string[], pageIndex: number): string {
  const body = lines
    .map((line, index) => {
      const y = 800 - index * 16;
      const fontSize = pageIndex === 0 && index === 0 ? 18 : 10;
      return `BT /F1 ${fontSize} Tf 40 ${y} Td (${pdfEscape(stripDiacritics(line))}) Tj ET`;
    })
    .join("\n");
  return `<< /Length ${byteLength(body)} >>\nstream\n${body}\nendstream`;
}

function pdfEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

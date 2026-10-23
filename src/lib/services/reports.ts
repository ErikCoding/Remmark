import { computeStats } from "@/lib/services/stats";
import { logBreak } from "@/lib/services/logs";
import { formatDuration, formatHoursDecimal, formatKey, formatRange, todayKey, weekdayShort } from "@/lib/utils/date";
import type { DateRange, Project, ReportLanguage, WorkLog } from "@/types/domain";

type Labels = typeof labels.pl;

const labels = {
  pl: {
    title: "Raport czasu pracy",
    worker: "Pracownik",
    period: "Okres",
    generated: "Wygenerowano",
    total: "Łącznie",
    days: "Dni pracy",
    breaks: "Przerwy",
    sites: "Budowy",
    bySite: "Podsumowanie budów",
    details: "Szczegóły",
    date: "Data",
    site: "Budowa",
    client: "Klient",
    hours: "Godziny",
    break: "Przerwa",
    time: "Czas",
    timeDecimal: "Godz.",
    description: "Opis",
    notes: "Notatka",
    entries: "Wpisy",
    empty: "Brak wpisów w wybranym okresie.",
    page: "Strona",
    of: "z",
    file: "raport",
  },
  nl: {
    title: "Urenrapport",
    worker: "Medewerker",
    period: "Periode",
    generated: "Gegenereerd",
    total: "Totaal",
    days: "Werkdagen",
    breaks: "Pauzes",
    sites: "Projecten",
    bySite: "Overzicht per project",
    details: "Details",
    date: "Datum",
    site: "Project",
    client: "Klant",
    hours: "Tijden",
    break: "Pauze",
    time: "Duur",
    timeDecimal: "Uren",
    description: "Omschrijving",
    notes: "Notitie",
    entries: "Regels",
    empty: "Geen registraties in deze periode.",
    page: "Pagina",
    of: "van",
    file: "urenrapport",
  },
};

export type ReportInput = {
  logs: WorkLog[];
  projects: Project[];
  range: DateRange;
  language: ReportLanguage;
  workerName: string;
};

const describe = (log: WorkLog, language: ReportLanguage) =>
  (language === "nl" ? log.descriptionNL || log.descriptionPL : log.descriptionPL) || "";

const sortLogs = (logs: WorkLog[]) =>
  [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime));

function fileName(input: ReportInput, ext: string) {
  const t: Labels = labels[input.language];
  return `${t.file}-${input.range.from}_${input.range.to}.${ext}`;
}

export function exportLogsToCsv(input: ReportInput): void {
  const t = labels[input.language];
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const header = [t.date, t.site, t.client, "Start", "Koniec", `${t.break} (min)`, `${t.time} (h)`, t.description, t.notes];
  const rows = sortLogs(input.logs).map((log) => {
    const project = projectById.get(log.projectId);
    return [
      log.dateKey,
      project?.name ?? "",
      project?.client ?? "",
      log.startTime,
      log.endTime,
      logBreak(log),
      formatHoursDecimal(log.durationMinutes),
      describe(log, input.language),
      log.notes ?? "",
    ];
  });
  const total = input.logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  rows.push(["", "", "", "", "", "", formatHoursDecimal(total), t.total, ""]);

  // Średnik + BOM, żeby polski Excel od razu poprawnie otworzył plik.
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n");
  downloadBlob(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), fileName(input, "csv"));
}

export async function exportLogsToPdf(input: ReportInput): Promise<void> {
  const t = labels[input.language];
  const [{ default: pdfMake }, vfsModule] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const vfs = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>);
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;

  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const stats = computeStats(input.logs, input.projects);
  const logs = sortLogs(input.logs);
  const ink = "#1B2430";
  const muted = "#6B7480";
  const line = "#DADFE5";
  const accent = "#E8590C";

  const summaryCell = (label: string, value: string) => ({
    stack: [
      { text: label.toUpperCase(), fontSize: 7, color: muted, bold: true, characterSpacing: 0.5 },
      { text: value, fontSize: 15, bold: true, color: ink, margin: [0, 3, 0, 0] },
    ],
    margin: [8, 8, 8, 8],
  });

  const tableLayout = {
    hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => line,
    paddingTop: () => 5,
    paddingBottom: () => 5,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    fillColor: (rowIndex: number) => (rowIndex === 0 ? "#F2F4F6" : null),
  };

  const head = (text: string, alignment: "left" | "right" = "left") => ({ text, bold: true, fontSize: 8, color: muted, alignment });

  const detailRows = logs.map((log) => {
    const project = projectById.get(log.projectId);
    const description = describe(log, input.language);
    return [
      { text: `${weekdayShort(log.dateKey)} ${formatKey(log.dateKey)}`, noWrap: true },
      { text: project?.name ?? "—", bold: true },
      { text: `${log.startTime}–${log.endTime}`, noWrap: true },
      { text: logBreak(log) ? `${logBreak(log)} min` : "—", alignment: "right" },
      { text: formatHoursDecimal(log.durationMinutes), alignment: "right", bold: true },
      { text: [description || "—", log.notes ? { text: `\n${log.notes}`, color: muted, italics: true } : ""] },
    ];
  });

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [36, 40, 36, 44],
    defaultStyle: { font: "Roboto", fontSize: 9, color: ink, lineHeight: 1.15 },
    info: { title: `${t.title} ${formatRange(input.range)}` },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Remmark · ${input.workerName}`, color: muted, fontSize: 7 },
        { text: `${t.page} ${currentPage} ${t.of} ${pageCount}`, alignment: "right", color: muted, fontSize: 7 },
      ],
      margin: [36, 12, 36, 0],
    }),
    content: [
      {
        columns: [
          {
            stack: [
              { text: "REMMARK", bold: true, fontSize: 9, color: accent, characterSpacing: 1.5 },
              { text: t.title, fontSize: 20, bold: true, margin: [0, 4, 0, 0] },
            ],
          },
          {
            width: "auto",
            stack: [
              { text: `${t.worker}: ${input.workerName}`, alignment: "right" },
              { text: `${t.period}: ${formatRange(input.range)}`, alignment: "right", bold: true },
              { text: `${t.generated}: ${formatKey(todayKey())}`, alignment: "right", color: muted, fontSize: 8 },
            ],
          },
        ],
      },
      {
        margin: [0, 16, 0, 0],
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              summaryCell(t.total, `${formatHoursDecimal(stats.totalMinutes)} h`),
              summaryCell(t.days, String(stats.daysWorked)),
              summaryCell(t.breaks, formatDuration(stats.totalBreakMinutes)),
              summaryCell(t.sites, String(stats.projectCount)),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => "#F6F7F9" },
      },
      ...(logs.length === 0
        ? [{ text: t.empty, margin: [0, 24, 0, 0], color: muted }]
        : [
            { text: t.bySite, fontSize: 12, bold: true, margin: [0, 20, 0, 6] },
            {
              table: {
                headerRows: 1,
                widths: ["*", "auto", "auto", "auto"],
                body: [
                  [head(t.site), head(t.days, "right"), head(t.entries, "right"), head(`${t.timeDecimal}`, "right")],
                  ...stats.byProject.map((project) => [
                    { stack: [{ text: project.name, bold: true }, project.client ? { text: project.client, color: muted, fontSize: 8 } : ""] },
                    { text: String(project.days), alignment: "right" },
                    { text: String(project.entries), alignment: "right" },
                    { text: formatHoursDecimal(project.minutes), alignment: "right", bold: true },
                  ]),
                  [
                    { text: t.total, bold: true },
                    { text: String(stats.daysWorked), alignment: "right", bold: true },
                    { text: String(stats.entries), alignment: "right", bold: true },
                    { text: formatHoursDecimal(stats.totalMinutes), alignment: "right", bold: true },
                  ],
                ],
              },
              layout: tableLayout,
            },
            { text: t.details, fontSize: 12, bold: true, margin: [0, 20, 0, 6] },
            {
              table: {
                headerRows: 1,
                dontBreakRows: true,
                widths: ["auto", 95, "auto", "auto", "auto", "*"],
                body: [
                  [head(t.date), head(t.site), head(t.hours), head(t.break, "right"), head(t.timeDecimal, "right"), head(t.description)],
                  ...detailRows,
                ],
              },
              layout: tableLayout,
            },
          ]),
    ],
  };

  pdfMake.createPdf(docDefinition as unknown as Parameters<typeof pdfMake.createPdf>[0]).download(fileName(input, "pdf"));
}

function csvEscape(value: string | number | undefined): string {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

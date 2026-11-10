import { computeStats } from "@/lib/services/stats";
import { TRAVEL_GROUP, isTravel, logBreak } from "@/lib/services/logs";
import { dateKeyToDate, formatDuration, formatHoursDecimal, todayKey } from "@/lib/utils/date";
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
    start: "Start",
    end: "Koniec",
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
    travel: "Jazda",
    travelTotal: "w tym jazda",
    dayTotal: "Razem dzień",
    signWorker: "Podpis pracownika",
    signClient: "Podpis zleceniodawcy",
    deleted: "Usunięta budowa",
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
    start: "Begin",
    end: "Einde",
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
    travel: "Reistijd",
    travelTotal: "waarvan reistijd",
    dayTotal: "Totaal dag",
    signWorker: "Handtekening medewerker",
    signClient: "Handtekening opdrachtgever",
    deleted: "Verwijderd project",
  },
};

/** Co ma się znaleźć w raporcie. */
export type PdfOptions = {
  summary: boolean;
  bySite: boolean;
  clients: boolean;
  details: boolean;
  times: boolean;
  breaks: boolean;
  descriptions: boolean;
  notes: boolean;
  dailyTotals: boolean;
  travel: boolean;
  signature: boolean;
};

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  summary: true,
  bySite: true,
  clients: true,
  details: true,
  times: true,
  breaks: true,
  descriptions: true,
  notes: false,
  dailyTotals: true,
  travel: true,
  signature: false,
};

const OPTIONS_KEY = "remmark:pdfOptions";

export function loadPdfOptions(): PdfOptions {
  if (typeof window === "undefined") return DEFAULT_PDF_OPTIONS;
  try {
    const raw = window.localStorage.getItem(OPTIONS_KEY);
    return raw ? { ...DEFAULT_PDF_OPTIONS, ...(JSON.parse(raw) as Partial<PdfOptions>) } : DEFAULT_PDF_OPTIONS;
  } catch {
    return DEFAULT_PDF_OPTIONS;
  }
}

export function savePdfOptions(options: PdfOptions): void {
  try {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // brak localStorage – ustawienia tylko na tę wizytę
  }
}

export type ReportInput = {
  logs: WorkLog[];
  projects: Project[];
  range: DateRange;
  language: ReportLanguage;
  workerName: string;
  options?: PdfOptions;
  /** Tłumaczenie tekstów użytkownika (nazwy budów, opisy) na język raportu. */
  tr?: (text: string) => string;
};

const identity = (text: string) => text;

/** Opis wpisu w języku raportu: ręczny opis NL ma pierwszeństwo przed tłumaczeniem automatycznym. */
export function describeLog(log: WorkLog, language: ReportLanguage, tr: (text: string) => string = identity): string {
  if (language === "nl") return log.descriptionNL || (log.descriptionPL ? tr(log.descriptionPL) : "");
  return log.descriptionPL || "";
}

export function reportPlaceName(
  log: WorkLog,
  projectById: Map<string, Project>,
  language: ReportLanguage,
  tr: (text: string) => string = identity,
): string {
  if (isTravel(log)) return labels[language].travel;
  const name = projectById.get(log.projectId)?.name;
  return name ? tr(name) : labels[language].deleted;
}

/** Teksty, które trzeba przetłumaczyć dla raportu NL. */
export function textsToTranslate(logs: WorkLog[], projects: Project[], options: PdfOptions): string[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const texts = new Set<string>();
  logs.forEach((log) => {
    const name = !isTravel(log) ? projectById.get(log.projectId)?.name : undefined;
    if (name) texts.add(name);
    if (options.descriptions && log.descriptionPL && !log.descriptionNL) texts.add(log.descriptionPL);
    if (options.notes && log.notes) texts.add(log.notes);
  });
  return Array.from(texts);
}

const sortLogs = (logs: WorkLog[]) =>
  [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime));

const locale = (language: ReportLanguage) => (language === "nl" ? "nl-NL" : "pl-PL");

function fmtDate(key: string, language: ReportLanguage) {
  return new Intl.DateTimeFormat(locale(language), { day: "2-digit", month: "2-digit", year: "numeric" }).format(dateKeyToDate(key));
}

function fmtWeekday(key: string, language: ReportLanguage) {
  return new Intl.DateTimeFormat(locale(language), { weekday: "short" }).format(dateKeyToDate(key)).replace(".", "");
}

function fmtRange(range: DateRange, language: ReportLanguage) {
  return range.from === range.to ? fmtDate(range.from, language) : `${fmtDate(range.from, language)} – ${fmtDate(range.to, language)}`;
}

function prepare(input: ReportInput) {
  const options = input.options ?? DEFAULT_PDF_OPTIONS;
  const logs = sortLogs(options.travel ? input.logs : input.logs.filter((log) => !isTravel(log)));
  return { options, logs, tr: input.tr ?? identity, t: labels[input.language] as Labels };
}

function fileName(input: ReportInput, ext: string) {
  return `${labels[input.language].file}-${input.range.from}_${input.range.to}.${ext}`;
}

export function exportLogsToCsv(input: ReportInput): void {
  const { options, logs, tr, t } = prepare(input);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const header = [
    t.date,
    t.site,
    ...(options.clients ? [t.client] : []),
    t.start,
    t.end,
    `${t.break} (min)`,
    `${t.time} (h)`,
    ...(options.descriptions ? [t.description] : []),
    ...(options.notes ? [t.notes] : []),
  ];
  const rows: Array<Array<string | number>> = logs.map((log) => {
    const project = isTravel(log) ? undefined : projectById.get(log.projectId);
    return [
      log.dateKey,
      reportPlaceName(log, projectById, input.language, tr),
      ...(options.clients ? [project?.client ?? ""] : []),
      log.startTime,
      log.endTime,
      logBreak(log),
      formatHoursDecimal(log.durationMinutes),
      ...(options.descriptions ? [describeLog(log, input.language, tr)] : []),
      ...(options.notes ? [log.notes ? (input.language === "nl" ? tr(log.notes) : log.notes) : ""] : []),
    ];
  });
  const total = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const totalRow: Array<string | number> = header.map(() => "");
  totalRow[0] = t.total;
  totalRow[header.indexOf(`${t.time} (h)`)] = formatHoursDecimal(total);
  rows.push(totalRow);

  // Średnik + BOM, żeby Excel od razu poprawnie otworzył plik z polskimi znakami.
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n");
  downloadBlob(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), fileName(input, "csv"));
}

export async function exportLogsToPdf(input: ReportInput): Promise<void> {
  const { options, logs, tr, t } = prepare(input);
  const lang = input.language;
  const [{ default: pdfMake }, vfsModule] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const vfs = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>);
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = vfs;

  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const stats = computeStats(logs, input.projects);
  const ink = "#1B2430";
  const muted = "#6B7480";
  const line = "#DADFE5";
  const accent = "#E8590C";

  const summaryCell = (label: string, value: string, note?: string) => ({
    stack: [
      { text: label.toUpperCase(), fontSize: 7, color: muted, bold: true, characterSpacing: 0.5 },
      { text: value, fontSize: 15, bold: true, color: ink, margin: [0, 3, 0, 0] },
      ...(note ? [{ text: note, fontSize: 7.5, color: muted, margin: [0, 2, 0, 0] }] : []),
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

  // Kolumny tabeli szczegółów zależą od wybranych opcji.
  type Column = { key: string; head: ReturnType<typeof head>; width: string | number };
  const columns: Column[] = [
    { key: "date", head: head(t.date), width: "auto" },
    { key: "site", head: head(t.site), width: options.descriptions ? 105 : "*" },
    ...(options.times ? [{ key: "times", head: head(t.hours), width: "auto" }] : []),
    ...(options.breaks ? [{ key: "break", head: head(t.break, "right"), width: "auto" }] : []),
    { key: "hours", head: head(t.timeDecimal, "right"), width: "auto" },
    ...(options.descriptions || options.notes ? [{ key: "desc", head: head(options.descriptions ? t.description : t.notes), width: "*" }] : []),
  ];
  const hoursIndex = columns.findIndex((column) => column.key === "hours");

  const cellFor = (key: string, log: WorkLog, firstOfDay: boolean) => {
    switch (key) {
      case "date":
        return firstOfDay
          ? { text: `${fmtWeekday(log.dateKey, lang)} ${fmtDate(log.dateKey, lang)}`, noWrap: true }
          : { text: "", noWrap: true };
      case "site":
        return isTravel(log)
          ? { text: t.travel, italics: true, color: muted }
          : { text: reportPlaceName(log, projectById, lang, tr), bold: true };
      case "times":
        return { text: `${log.startTime}–${log.endTime}`, noWrap: true };
      case "break":
        return { text: logBreak(log) ? `${logBreak(log)} min` : "—", alignment: "right", noWrap: true };
      case "hours":
        return { text: formatHoursDecimal(log.durationMinutes), alignment: "right", bold: true };
      default: {
        const description = options.descriptions ? describeLog(log, lang, tr) : "";
        const note = options.notes && log.notes ? (lang === "nl" ? tr(log.notes) : log.notes) : "";
        return {
          text: [description || (note ? "" : "—"), note ? { text: `${description ? "\n" : ""}${note}`, color: muted, italics: true } : ""],
        };
      }
    }
  };

  const detailRows: unknown[][] = [];
  const byDay = new Map<string, WorkLog[]>();
  logs.forEach((log) => byDay.set(log.dateKey, [...(byDay.get(log.dateKey) ?? []), log]));
  byDay.forEach((dayLogs) => {
    dayLogs.forEach((log, index) => detailRows.push(columns.map((column) => cellFor(column.key, log, index === 0))));
    if (options.dailyTotals && dayLogs.length > 1) {
      const dayMinutes = dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
      detailRows.push(
        columns.map((column, index) => {
          if (index === 0) return { text: t.dayTotal, colSpan: hoursIndex, alignment: "right", color: muted, fontSize: 8 };
          if (index === hoursIndex) return { text: formatHoursDecimal(dayMinutes), alignment: "right", bold: true, fillColor: "#F6F7F9" };
          return {};
        }),
      );
    }
  });

  const showClients = options.clients && stats.byProject.some((project) => project.client);

  const content: unknown[] = [
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
            { text: `${t.period}: ${fmtRange(input.range, lang)}`, alignment: "right", bold: true },
            { text: `${t.generated}: ${fmtDate(todayKey(), lang)}`, alignment: "right", color: muted, fontSize: 8 },
          ],
        },
      ],
    },
  ];

  if (options.summary) {
    content.push({
      margin: [0, 16, 0, 0],
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            summaryCell(
              t.total,
              `${formatHoursDecimal(stats.totalMinutes)} h`,
              stats.travelMinutes ? `${t.travelTotal} ${formatHoursDecimal(stats.travelMinutes)} h` : undefined,
            ),
            summaryCell(t.days, String(stats.daysWorked)),
            summaryCell(t.breaks, formatDuration(stats.totalBreakMinutes)),
            summaryCell(t.sites, String(stats.projectCount)),
          ],
        ],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => "#F6F7F9" },
    });
  }

  if (logs.length === 0) {
    content.push({ text: t.empty, margin: [0, 24, 0, 0], color: muted });
  } else {
    if (options.bySite) {
      content.push(
        { text: t.bySite, fontSize: 12, bold: true, margin: [0, 20, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: [
              [head(t.site), head(t.days, "right"), head(t.entries, "right"), head(t.timeDecimal, "right")],
              ...stats.byProject.map((project) => [
                {
                  stack: [
                    { text: project.projectId === TRAVEL_GROUP ? t.travel : tr(project.name), bold: true },
                    showClients && project.client ? { text: project.client, color: muted, fontSize: 8 } : "",
                  ],
                },
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
      );
    }

    if (options.details) {
      const totalRow = columns.map((column, index) => {
        if (index === 0) return { text: t.total, bold: true, colSpan: hoursIndex };
        if (index === hoursIndex) return { text: formatHoursDecimal(stats.totalMinutes), alignment: "right", bold: true };
        return {};
      });
      content.push(
        { text: t.details, fontSize: 12, bold: true, margin: [0, 20, 0, 6] },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: columns.map((column) => column.width),
            body: [columns.map((column) => column.head), ...detailRows, totalRow],
          },
          layout: tableLayout,
        },
      );
    }
  }

  if (options.signature) {
    const signBox = (label: string) => ({
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.7, lineColor: ink }], margin: [0, 44, 0, 4] },
        { text: label, color: muted, fontSize: 8 },
      ],
    });
    content.push({ columns: [signBox(t.signWorker), signBox(t.signClient)], columnGap: 40, margin: [0, 28, 0, 0], unbreakable: true });
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [36, 40, 36, 44],
    defaultStyle: { font: "Roboto", fontSize: 9, color: ink, lineHeight: 1.15 },
    info: { title: `${t.title} ${fmtRange(input.range, lang)}` },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Remmark · ${input.workerName}`, color: muted, fontSize: 7 },
        { text: `${t.page} ${currentPage} ${t.of} ${pageCount}`, alignment: "right", color: muted, fontSize: 7 },
      ],
      margin: [36, 12, 36, 0],
    }),
    content,
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

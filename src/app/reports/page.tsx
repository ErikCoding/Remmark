"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Download, FileSpreadsheet, Languages, Printer, RotateCw } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { BarChart, type Bar } from "@/components/stats/bar-chart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { TRAVEL_GROUP, logBreak, logGroupId, logPlaceName, paidLogs } from "@/lib/services/logs";
import {
  DEFAULT_PDF_OPTIONS,
  type PdfOptions,
  describeLog,
  exportLogsToCsv,
  exportLogsToPdf,
  loadPdfOptions,
  reportPlaceName,
  savePdfOptions,
  textsToTranslate,
} from "@/lib/services/reports";
import { clearTranslationCache, translateToDutch } from "@/lib/services/translate";
import { computeStats, monthlyTotals } from "@/lib/services/stats";
import {
  addDays,
  dateKeyToDate,
  daysInRange,
  endOfMonthKey,
  endOfWeekKey,
  formatDuration,
  formatHoursDecimal,
  formatKey,
  formatRange,
  isWeekend,
  monthLabel,
  previousMonthRange,
  previousWeekRange,
  startOfMonthKey,
  startOfWeekKey,
  todayKey,
  weekdayShort,
} from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";
import type { DateRange, ReportLanguage } from "@/types/domain";

type Preset = "tydzien" | "poprz-tydzien" | "miesiac" | "poprz-miesiac" | "rok" | "wszystko" | "wlasny";

const presets: Array<{ value: Preset; label: string }> = [
  { value: "tydzien", label: "Ten tydzień" },
  { value: "poprz-tydzien", label: "Poprzedni tydzień" },
  { value: "miesiac", label: "Ten miesiąc" },
  { value: "poprz-miesiac", label: "Poprzedni miesiąc" },
  { value: "rok", label: "Ten rok" },
  { value: "wlasny", label: "Wybierz daty" },
];

export default function ReportsPage() {
  return (
    <AppShell wide>
      <Suspense fallback={<SkeletonList />}>
        <Reports />
      </Suspense>
    </AppShell>
  );
}

function presetRange(preset: Preset, custom: DateRange): DateRange {
  const today = todayKey();
  switch (preset) {
    case "tydzien":
      return { from: startOfWeekKey(), to: endOfWeekKey() };
    case "poprz-tydzien":
      return previousWeekRange();
    case "miesiac":
      return { from: startOfMonthKey(), to: endOfMonthKey() };
    case "poprz-miesiac":
      return previousMonthRange();
    case "rok":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case "wszystko":
      return { from: "2000-01-01", to: today };
    default:
      return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
  }
}

function Reports() {
  const params = useSearchParams();
  const { user, profile } = useAuth();
  const { projects } = useProjects();
  const initialPreset = (params.get("okres") as Preset) || "miesiac";
  const [preset, setPreset] = useState<Preset>(
    [...presets.map((item) => item.value), "wszystko"].includes(initialPreset) ? initialPreset : "miesiac",
  );
  const [custom, setCustom] = useState<DateRange>({ from: startOfMonthKey(), to: todayKey() });
  const [projectId, setProjectId] = useState(params.get("budowa") ?? "all");
  const [language, setLanguage] = useState<ReportLanguage>("pl");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [options, setOptions] = useState<PdfOptions>(DEFAULT_PDF_OPTIONS);
  const [showOptions, setShowOptions] = useState(false);
  const [nlMap, setNlMap] = useState<Map<string, string>>(new Map());
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateRun, setTranslateRun] = useState(0);

  useEffect(() => setOptions(loadPdfOptions()), []);

  function setOption(key: keyof PdfOptions, value: boolean) {
    setOptions((current) => {
      const next = { ...current, [key]: value };
      savePdfOptions(next);
      return next;
    });
  }

  const range = presetRange(preset, custom);
  const { logs: rangeLogs, loading } = useRangeLogs(user?.uid, range);
  const logs = useMemo(
    () =>
      paidLogs(rangeLogs)
        .filter((log) => projectId === "all" || logGroupId(log) === projectId)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime)),
    [projectId, rangeLogs],
  );

  // Dla „wszystko” pokaż faktyczny zakres od pierwszego wpisu.
  const firstKey = logs[0]?.dateKey;
  const lastKey = logs[logs.length - 1]?.dateKey;
  const shownRange: DateRange = useMemo(
    () => (preset === "wszystko" && firstKey && lastKey ? { from: firstKey, to: lastKey } : { from: range.from, to: range.to }),
    [firstKey, lastKey, preset, range.from, range.to],
  );
  const dayCount = daysInRange(shownRange).length;
  const daily = dayCount <= 45;
  const stats = useMemo(() => computeStats(logs, projects, daily ? shownRange : undefined), [daily, logs, projects, shownRange]);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const today = todayKey();

  const bars: Bar[] = daily
    ? stats.byDay.map((day) => ({
        key: day.dateKey,
        label: dayCount <= 8 ? weekdayShort(day.dateKey).replace(".", "") : dayLabel(day.dateKey, dayCount),
        minutes: day.minutes,
        muted: isWeekend(day.dateKey),
        highlight: day.dateKey === today,
        title: `${formatKey(day.dateKey)}: ${formatDuration(day.minutes)}`,
      }))
    : fillMonths(shownRange, monthlyTotals(logs)).map((month) => ({
        key: month.monthKey,
        label: monthLabel(month.monthKey, false).replace(".", ""),
        minutes: month.minutes,
        title: `${monthLabel(month.monthKey)}: ${formatDuration(month.minutes)}`,
      }));

  // Raport NL: przetłumacz nazwy budów, opisy i (jeśli włączone) notatki.
  const toTranslate = useMemo(
    () => (language === "nl" ? textsToTranslate(logs, projects, { ...options, descriptions: true }) : []),
    [language, logs, options, projects],
  );
  const translateKey = toTranslate.join("\u0001");
  useEffect(() => {
    if (language !== "nl" || toTranslate.length === 0) {
      setTranslateError(null);
      return;
    }
    let cancelled = false;
    setTranslating(true);
    setTranslateError(null);
    translateToDutch(toTranslate)
      .then((map) => {
        if (!cancelled) setNlMap((current) => new Map([...current, ...map]));
      })
      .catch((error: unknown) => {
        if (!cancelled) setTranslateError(error instanceof Error ? error.message : "Tłumaczenie nie zadziałało.");
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, translateKey, translateRun]);

  const tr = (text: string) => (language === "nl" ? nlMap.get(text.trim()) ?? text : text);
  const placeLabel = (log: (typeof logs)[number]) => (language === "nl" ? reportPlaceName(log, projectById, language, tr) : logPlaceName(log, projectById));
  const missingTranslations = language === "nl" ? toTranslate.filter((text) => !nlMap.has(text)).length : 0;

  const exportInput = {
    logs,
    projects,
    range: shownRange,
    language,
    workerName: profile?.name || user?.email || "",
    options,
    tr,
  };

  async function downloadPdf() {
    if (
      missingTranslations > 0 &&
      !window.confirm("Część tekstów nie jest przetłumaczona i zostanie po polsku. Pobrać PDF mimo to?")
    ) {
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      await exportLogsToPdf(exportInput);
    } catch {
      setExportError("Nie udało się utworzyć PDF. Spróbuj jeszcze raz.");
    } finally {
      setExporting(false);
    }
  }

  const nothingSelected = !options.summary && !options.bySite && !options.details;

  const selectedName = projectId === TRAVEL_GROUP ? "Jazda" : projectId !== "all" ? projectById.get(projectId)?.name : undefined;

  return (
    <>
      <div className="no-print">
        <PageHeader title="Raporty" subtitle="Wybierz okres – zobacz podsumowanie i pobierz raport." />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presets.map((item) => (
            <button className={classNames("chip", preset === item.value && "chip-on")} key={item.value} onClick={() => setPreset(item.value)} type="button">
              {item.label}
            </button>
          ))}
        </div>
        {preset === "wszystko" ? (
          <p className="mt-2 text-[15px] text-steel">Pokazuję wszystkie wpisy.</p>
        ) : null}
        {preset === "wlasny" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Od">
              <Input type="date" value={custom.from} onChange={(event) => setCustom((value) => ({ ...value, from: event.target.value }))} />
            </Field>
            <Field label="Do">
              <Input type="date" value={custom.to} onChange={(event) => setCustom((value) => ({ ...value, to: event.target.value }))} />
            </Field>
          </div>
        ) : null}

        <Select aria-label="Budowa" className="mt-3" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="all">Wszystkie budowy</option>
          <option value={TRAVEL_GROUP}>Tylko jazda</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Nagłówek tylko do druku */}
      <div className="hidden print:block">
        <p className="font-cond text-3xl font-bold">Raport czasu pracy</p>
        <p>
          {profile?.name ? `${profile.name} · ` : ""}
          {formatRange(shownRange)}
          {selectedName ? ` · ${selectedName}` : ""}
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <SkeletonList />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="panel print-flat p-4 sm:p-5">
            <p className="text-[15px] text-steel">
              {formatRange(shownRange)}
              {selectedName ? ` · ${selectedName}` : ""}
            </p>
            <div className="mt-1 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-cond text-[64px] font-bold leading-[0.95] text-ink">{formatHoursDecimal(stats.totalMinutes)} h</p>
                <p className="text-[15px] text-steel">
                  {formatDuration(stats.totalMinutes)} pracy bez przerw
                  {stats.travelMinutes && projectId === "all" ? `, w tym jazda ${formatDuration(stats.travelMinutes)}` : ""}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[15px] sm:min-w-[300px]">
                <Stat label="Dni pracy" value={String(stats.daysWorked)} />
                <Stat label="Średnio dziennie" value={stats.daysWorked ? formatDuration(stats.avgPerDay) : "–"} />
                <Stat label="Przerwy razem" value={formatDuration(stats.totalBreakMinutes)} />
                <Stat label="Zwykle" value={stats.avgStart && stats.avgEnd ? `${stats.avgStart}–${stats.avgEnd}` : "–"} />
                <Stat
                  label="Najdłuższy dzień"
                  value={stats.longestDay ? `${formatDuration(stats.longestDay.minutes)} (${formatKey(stats.longestDay.dateKey).slice(0, 5)})` : "–"}
                />
                <Stat label="Budowy" value={String(stats.projectCount)} />
              </dl>
            </div>
          </section>

          {logs.length === 0 ? (
            <EmptyState title="Brak wpisów w tym okresie" body="Wybierz inny okres albo inną budowę." />
          ) : (
            <>
              <section className="panel no-print p-4 sm:p-5">
                <h2 className="section-title mb-4">{daily ? "Godziny dzień po dniu" : "Godziny miesiąc po miesiącu"}</h2>
                <BarChart bars={bars} height={daily && dayCount > 14 ? 120 : 150} />
                {daily && dayCount > 14 ? <p className="mt-2 text-sm text-steel">Szare słupki to soboty i niedziele.</p> : null}
              </section>

              {projectId === "all" ? (
                <section className="panel print-flat p-4 sm:p-5">
                  <h2 className="section-title mb-3">Podział na budowy</h2>
                  <ul className="space-y-3">
                    {stats.byProject.map((project) => {
                      const pct = stats.totalMinutes ? (project.minutes / stats.totalMinutes) * 100 : 0;
                      return (
                        <li key={project.projectId}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-[17px] font-semibold text-ink">{project.name}</span>
                            <span className="shrink-0 font-cond text-xl font-bold text-ink">{formatHoursDecimal(project.minutes)} h</span>
                          </div>
                          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-well">
                            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(pct, 1.5)}%` }} />
                          </div>
                          <p className="mt-0.5 text-sm text-steel">
                            {project.days} {project.days === 1 ? "dzień" : "dni"} · {Math.round(pct)}%
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <section className="panel no-print p-4 sm:p-5">
                <h2 className="section-title">Pobierz raport</h2>
                <p className="mb-3 mt-0.5 text-[15px] text-steel">
                  {logs.length} {logs.length === 1 ? "wpis" : logs.length < 5 ? "wpisy" : "wpisów"} z wybranego okresu.
                </p>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] text-steel">Język raportu:</span>
                  {(["pl", "nl"] as const).map((value) => (
                    <button
                      className={classNames("chip min-h-10 px-3 text-[15px]", language === value && "chip-on")}
                      key={value}
                      onClick={() => setLanguage(value)}
                      type="button"
                    >
                      {value === "pl" ? "Polski" : "Nederlands"}
                    </button>
                  ))}
                </div>
                {language === "nl" ? (
                  <div className="mb-3 text-[15px]" aria-live="polite">
                    {translating ? (
                      <p className="flex items-center gap-2 text-steel">
                        <Languages className="h-4 w-4 animate-pulse" />
                        Tłumaczę nazwy budów i opisy na niderlandzki…
                      </p>
                    ) : translateError ? (
                      <div className="rounded-xl bg-stop-soft px-3 py-2 text-stop">
                        <p className="font-semibold">Tłumaczenie nie zadziałało: {translateError}</p>
                        <button
                          className="mt-1 flex min-h-10 items-center gap-1.5 font-semibold underline underline-offset-4"
                          onClick={() => setTranslateRun((value) => value + 1)}
                          type="button"
                        >
                          <RotateCw className="h-4 w-4" />
                          Spróbuj ponownie
                        </button>
                      </div>
                    ) : toTranslate.length ? (
                      <p className="flex flex-wrap items-center gap-x-3 text-go">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Check className="h-4 w-4" />
                          Nazwy budów i opisy przetłumaczone
                        </span>
                        <button
                          className="min-h-10 text-steel underline underline-offset-4"
                          onClick={() => {
                            clearTranslationCache();
                            setNlMap(new Map());
                            setTranslateRun((value) => value + 1);
                          }}
                          type="button"
                        >
                          Przetłumacz od nowa
                        </button>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mb-3 rounded-xl border border-line">
                  <button
                    aria-expanded={showOptions}
                    className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left"
                    onClick={() => setShowOptions((value) => !value)}
                    type="button"
                  >
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">Co ma być w raporcie</span>
                      <span className="block text-sm text-steel">{optionsSummary(options)}</span>
                    </span>
                    <ChevronDown className={classNames("h-5 w-5 shrink-0 text-steel transition-transform", showOptions && "rotate-180")} />
                  </button>
                  {showOptions ? (
                    <div className="space-y-4 border-t border-line p-3">
                      <OptionGroup title="Części raportu">
                        <OptionToggle checked={options.summary} label="Podsumowanie" hint="Godziny, dni, przerwy na górze" onChange={(v) => setOption("summary", v)} />
                        <OptionToggle checked={options.bySite} label="Podział na budowy" onChange={(v) => setOption("bySite", v)} />
                        <OptionToggle checked={options.details} label="Lista wpisów" hint="Dzień po dniu" onChange={(v) => setOption("details", v)} />
                        <OptionToggle checked={options.signature} label="Miejsce na podpisy" onChange={(v) => setOption("signature", v)} />
                      </OptionGroup>
                      <OptionGroup title="W liście wpisów">
                        <OptionToggle checked={options.times} disabled={!options.details} label="Godziny od–do" onChange={(v) => setOption("times", v)} />
                        <OptionToggle checked={options.breaks} disabled={!options.details} label="Przerwy" onChange={(v) => setOption("breaks", v)} />
                        <OptionToggle checked={options.descriptions} disabled={!options.details} label="Opis pracy" onChange={(v) => setOption("descriptions", v)} />
                        <OptionToggle checked={options.notes} disabled={!options.details} label="Notatki" hint="Zwykle tylko dla siebie" onChange={(v) => setOption("notes", v)} />
                        <OptionToggle checked={options.dailyTotals} disabled={!options.details} label="Suma każdego dnia" hint="Gdy w dniu było kilka miejsc" onChange={(v) => setOption("dailyTotals", v)} />
                      </OptionGroup>
                      <OptionGroup title="Inne">
                        <OptionToggle checked={options.travel} label="Jazda" hint="Wyłączona – jazda nie wlicza się do sumy" onChange={(v) => setOption("travel", v)} />
                        <OptionToggle checked={options.clients} label="Klienci przy budowach" onChange={(v) => setOption("clients", v)} />
                      </OptionGroup>
                      <button
                        className="min-h-10 text-[15px] font-semibold text-steel underline underline-offset-4"
                        onClick={() => {
                          setOptions(DEFAULT_PDF_OPTIONS);
                          savePdfOptions(DEFAULT_PDF_OPTIONS);
                        }}
                        type="button"
                      >
                        Przywróć domyślne
                      </button>
                    </div>
                  ) : null}
                </div>
                {nothingSelected ? <p className="mb-2 text-[15px] font-semibold text-stop">Zaznacz przynajmniej jedną część raportu.</p> : null}
                {!options.travel && stats.travelMinutes ? (
                  <p className="mb-2 text-[15px] text-steel">Jazda ({formatDuration(stats.travelMinutes)}) nie trafi do raportu ani do sumy.</p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button disabled={exporting || nothingSelected || translating} size="lg" variant="vis" onClick={downloadPdf}>
                    <Download className="h-5 w-5" />
                    {exporting ? "Tworzę PDF…" : translating ? "Tłumaczę…" : "Pobierz PDF"}
                  </Button>
                  <Button disabled={translating} size="lg" variant="secondary" onClick={() => exportLogsToCsv(exportInput)}>
                    <FileSpreadsheet className="h-5 w-5" />
                    Do Excela
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => window.print()}>
                    <Printer className="h-5 w-5" />
                    Drukuj
                  </Button>
                </div>
                {exportError ? <p className="mt-2 text-[15px] font-semibold text-stop">{exportError}</p> : null}
              </section>

              <section className="panel print-flat overflow-hidden">
                <h2 className="section-title px-4 pb-2 pt-4 sm:px-5">Wszystkie wpisy</h2>
                <ul className="divide-y divide-line border-t border-line sm:hidden print:hidden">
                  {logs.map((log) => (
                    <li className="flex gap-3 px-4 py-3" key={log.id}>
                      <div className="w-16 shrink-0">
                        <p className="font-semibold text-ink">{formatKey(log.dateKey).slice(0, 5)}</p>
                        <p className="text-sm text-steel">{weekdayShort(log.dateKey)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        {projectId === "all" ? <p className="truncate font-semibold text-ink">{placeLabel(log)}</p> : null}
                        <p className="text-sm text-steel">
                          {log.startTime}–{log.endTime}
                          {logBreak(log) ? `, przerwa ${logBreak(log)} min` : ""}
                        </p>
                        {describeLog(log, language, tr) ? <p className="mt-0.5 text-sm leading-snug text-ink">{describeLog(log, language, tr)}</p> : null}
                      </div>
                      <p className="shrink-0 font-cond text-lg font-bold text-ink">{formatHoursDecimal(log.durationMinutes)} h</p>
                    </li>
                  ))}
                  <li className="flex justify-between px-4 py-3 font-semibold">
                    <span>Razem</span>
                    <span className="font-cond text-lg font-bold">{formatHoursDecimal(stats.totalMinutes)} h</span>
                  </li>
                </ul>
                <div className="hidden overflow-x-auto sm:block print:block">
                  <table className="w-full min-w-[600px] border-collapse text-[15px]">
                    <thead>
                      <tr className="border-y border-line bg-well text-left text-sm text-steel">
                        <th className="px-4 py-2 font-semibold sm:pl-5">Data</th>
                        {projectId === "all" ? <th className="px-2 py-2 font-semibold">Budowa</th> : null}
                        <th className="px-2 py-2 font-semibold">Godziny</th>
                        <th className="px-2 py-2 text-right font-semibold">Przerwa</th>
                        <th className="px-2 py-2 text-right font-semibold">Czas</th>
                        <th className="px-4 py-2 font-semibold">Opis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr className="border-b border-line align-top" key={log.id}>
                          <td className="whitespace-nowrap px-4 py-2.5 sm:pl-5">
                            {weekdayShort(log.dateKey)} {formatKey(log.dateKey).slice(0, 5)}
                          </td>
                          {projectId === "all" ? <td className="px-2 py-2.5 font-semibold">{placeLabel(log)}</td> : null}
                          <td className="whitespace-nowrap px-2 py-2.5">
                            {log.startTime}–{log.endTime}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right text-steel">{logBreak(log) ? `${logBreak(log)} min` : "–"}</td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold">{formatHoursDecimal(log.durationMinutes)} h</td>
                          <td className="px-4 py-2.5 text-steel">
                            {describeLog(log, language, tr) || "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="px-4 py-3 sm:pl-5" colSpan={projectId === "all" ? 4 : 3}>
                          Razem
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right">{formatHoursDecimal(stats.totalMinutes)} h</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-steel">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function dayLabel(dateKey: string, dayCount: number) {
  const day = dateKeyToDate(dateKey).getDate();
  if (dayCount <= 16) return String(day);
  return day === 1 || day % 5 === 0 ? String(day) : "";
}

function fillMonths(range: DateRange, totals: Array<{ monthKey: string; minutes: number }>) {
  const map = new Map(totals.map((item) => [item.monthKey, item.minutes]));
  const months: Array<{ monthKey: string; minutes: number }> = [];
  let cursor = `${range.from.slice(0, 7)}-01`;
  const last = `${range.to.slice(0, 7)}-01`;
  let guard = 0;
  while (cursor <= last && guard < 120) {
    months.push({ monthKey: cursor, minutes: map.get(cursor) ?? 0 });
    cursor = addDays(endOfMonthKey(dateKeyToDate(cursor)), 1);
    guard += 1;
  }
  return months.slice(-24);
}

function optionsSummary(options: PdfOptions): string {
  const parts = [
    options.summary && "podsumowanie",
    options.bySite && "budowy",
    options.details && "lista wpisów",
    options.signature && "podpisy",
  ].filter(Boolean);
  const extras = [!options.travel && "bez jazdy", options.notes && "z notatkami"].filter(Boolean);
  return [parts.join(", ") || "nic nie zaznaczono", ...extras].join(" · ");
}

function OptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-steel">{title}</legend>
      <div className="grid gap-1 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function OptionToggle({
  checked,
  label,
  hint,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={classNames("flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-well", disabled && "cursor-not-allowed opacity-45")}>
      <input
        checked={checked}
        className="h-5 w-5 shrink-0 accent-[#1F2830]"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-tight text-ink">{label}</span>
        {hint ? <span className="block text-sm leading-tight text-steel"> {hint}</span> : null}
      </span>
    </label>
  );
}

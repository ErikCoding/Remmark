"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
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
import { logBreak } from "@/lib/services/logs";
import { exportLogsToCsv, exportLogsToPdf } from "@/lib/services/reports";
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
import type { DateRange, ReportLanguage, WorkLog } from "@/types/domain";

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

  const range = presetRange(preset, custom);
  const { logs: rangeLogs, loading } = useRangeLogs(user?.uid, range);
  const logs = useMemo(
    () =>
      rangeLogs
        .filter((log) => projectId === "all" || log.projectId === projectId)
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

  const exportInput = {
    logs,
    projects,
    range: shownRange,
    language,
    workerName: profile?.name || user?.email || "",
  };

  async function downloadPdf() {
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

  const selectedProject = projectId !== "all" ? projectById.get(projectId) : undefined;

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
          {selectedProject ? ` · ${selectedProject.name}` : ""}
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
              {selectedProject ? ` · ${selectedProject.name}` : ""}
            </p>
            <div className="mt-1 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-cond text-[64px] font-bold leading-[0.95] text-ink">{formatHoursDecimal(stats.totalMinutes)} h</p>
                <p className="text-[15px] text-steel">{formatDuration(stats.totalMinutes)} pracy bez przerw</p>
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
                <div className="mb-3 flex items-center gap-2">
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button disabled={exporting} size="lg" variant="vis" onClick={downloadPdf}>
                    <Download className="h-5 w-5" />
                    {exporting ? "Tworzę PDF…" : "Pobierz PDF"}
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => exportLogsToCsv(exportInput)}>
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
                        {projectId === "all" ? <p className="truncate font-semibold text-ink">{projectById.get(log.projectId)?.name ?? "–"}</p> : null}
                        <p className="text-sm text-steel">
                          {log.startTime}–{log.endTime}
                          {logBreak(log) ? `, przerwa ${logBreak(log)} min` : ""}
                        </p>
                        {describeLog(log, language) ? <p className="mt-0.5 text-sm leading-snug text-ink">{describeLog(log, language)}</p> : null}
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
                          {projectId === "all" ? <td className="px-2 py-2.5 font-semibold">{projectById.get(log.projectId)?.name ?? "–"}</td> : null}
                          <td className="whitespace-nowrap px-2 py-2.5">
                            {log.startTime}–{log.endTime}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right text-steel">{logBreak(log) ? `${logBreak(log)} min` : "–"}</td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold">{formatHoursDecimal(log.durationMinutes)} h</td>
                          <td className="px-4 py-2.5 text-steel">
                            {describeLog(log, language) || "–"}
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

function describeLog(log: WorkLog, language: ReportLanguage) {
  return language === "nl" ? log.descriptionNL || log.descriptionPL : log.descriptionPL;
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

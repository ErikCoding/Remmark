"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { exportLogsToCsv, exportLogsToPdf } from "@/lib/services/reports";
import { formatDuration, previousMonthRange, startOfMonthKey, startOfWeekKey, todayKey } from "@/lib/utils/date";
import type { DateRange, Project, ReportLanguage, WorkLog } from "@/types/domain";

type Preset = "today" | "week" | "month" | "previousMonth" | "custom";

export default function ReportsPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [preset, setPreset] = useState<Preset>("week");
  const [customRange, setCustomRange] = useState<DateRange>({ from: startOfWeekKey(), to: todayKey() });
  const [projectId, setProjectId] = useState("all");
  const [client, setClient] = useState("all");
  const [language, setLanguage] = useState<ReportLanguage>("pl");
  const range = presetToRange(preset, customRange);
  const { logs } = useRangeLogs(user?.uid, range);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const clients = Array.from(new Set(projects.map((project) => project.client))).sort();
  const filteredLogs = logs
    .filter((log) => {
      const project = projectById.get(log.projectId);
      return (projectId === "all" || log.projectId === projectId) && (client === "all" || project?.client === client);
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.startTime.localeCompare(b.startTime));

  const groups = useMemo(() => groupLogs(filteredLogs, projects), [filteredLogs, projects]);
  const totalMinutes = filteredLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const rangeLabel = `${range.from} - ${range.to}`;

  return (
    <AppShell>
      <PageHeader title="Raporty" subtitle="Eksportuj zestawienie pracy dla klienta lub budowy." />
      <div className="space-y-5">
        <section className="no-print tool-panel space-y-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted" />
            <p className="text-sm font-black text-ink">Ustawienia raportu</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
              <option value="today">Dzisiaj</option>
              <option value="week">Ten tydzień</option>
              <option value="month">Ten miesiąc</option>
              <option value="previousMonth">Poprzedni miesiąc</option>
              <option value="custom">Własny zakres</option>
            </Select>
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="all">Wszystkie budowy</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select value={client} onChange={(event) => setClient(event.target.value)}>
              <option value="all">Wszyscy klienci</option>
              {clients.map((clientName) => (
                <option key={clientName} value={clientName}>
                  {clientName}
                </option>
              ))}
            </Select>
            <Select value={language} onChange={(event) => setLanguage(event.target.value as ReportLanguage)}>
              <option value="pl">Polski</option>
              <option value="nl">Nederlands</option>
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <Input type="date" value={customRange.from} onChange={(event) => setCustomRange((value) => ({ ...value, from: event.target.value }))} />
              <Input type="date" value={customRange.to} onChange={(event) => setCustomRange((value) => ({ ...value, to: event.target.value }))} />
            </>
          ) : null}
        </section>
        <div className="no-print grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={() => exportLogsToPdf(filteredLogs, projects, rangeLabel, language)}>
            <Download className="h-4 w-4" />
            Pobierz PDF
          </Button>
          <Button variant="secondary" onClick={() => exportLogsToCsv(filteredLogs, projects, language)}>
            <FileSpreadsheet className="h-4 w-4" />
            Eksport CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Drukuj
          </Button>
        </div>
        <section className="surface-flat p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Raport pracy</p>
              <h2 className="mt-1 text-3xl font-black text-ink">Remmark</h2>
              <p className="mt-1 text-sm font-semibold text-muted">Zakres: {rangeLabel}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted">Łącznie</p>
              <p className="mt-1 text-xl font-black text-ink">{formatDuration(totalMinutes)}</p>
            </div>
          </div>
          {filteredLogs.length === 0 ? <EmptyState title="Brak danych w raporcie" /> : null}
          <div className="space-y-7">
            {groups.map((group) => (
              <div key={group.project.id}>
                <h3 className="text-lg font-black text-ink">{group.project.name}</h3>
                <p className="text-sm text-muted">{group.project.address}</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-muted">
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Godziny</th>
                        <th className="py-2 pr-3">Czas</th>
                        <th className="py-2 pr-3">Opis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.logs.map((log) => (
                        <tr className="border-b border-line align-top" key={log.id}>
                          <td className="py-3 pr-3">{log.dateKey}</td>
                          <td className="py-3 pr-3">{log.startTime} - {log.endTime}</td>
                          <td className="py-3 pr-3">{formatDuration(log.durationMinutes)}</td>
                          <td className="py-3 pr-3">{language === "nl" ? log.descriptionNL || log.descriptionPL : log.descriptionPL}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-right font-bold text-ink">Łącznie dla budowy: {formatDuration(group.totalMinutes)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function presetToRange(preset: Preset, custom: DateRange): DateRange {
  if (preset === "today") return { from: todayKey(), to: todayKey() };
  if (preset === "week") return { from: startOfWeekKey(), to: todayKey() };
  if (preset === "month") return { from: startOfMonthKey(), to: todayKey() };
  if (preset === "previousMonth") return previousMonthRange();
  return custom;
}

function groupLogs(logs: WorkLog[], projects: Project[]) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const fallbackProject: Project = {
    id: "unknown",
    name: "Nieznana budowa",
    client: "",
    address: "",
    status: "active",
  };

  const groups = new Map<string, { project: Project; logs: WorkLog[]; totalMinutes: number }>();
  logs.forEach((log) => {
    const project = projectById.get(log.projectId) ?? { ...fallbackProject, id: log.projectId };
    const current = groups.get(log.projectId) ?? { project, logs: [], totalMinutes: 0 };
    current.logs.push(log);
    current.totalMinutes += log.durationMinutes;
    groups.set(log.projectId, current);
  });
  return Array.from(groups.values()).sort((a, b) => a.project.name.localeCompare(b.project.name, "pl"));
}

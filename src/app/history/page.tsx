"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogCard } from "@/components/logs/log-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { previousMonthRange, startOfMonthKey, startOfWeekKey, todayKey } from "@/lib/utils/date";
import type { DateRange } from "@/types/domain";

type RangePreset = "today" | "week" | "month" | "custom";

export default function HistoryPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [preset, setPreset] = useState<RangePreset>("month");
  const [customRange, setCustomRange] = useState<DateRange>({ from: startOfMonthKey(), to: todayKey() });
  const [projectId, setProjectId] = useState("all");
  const [client, setClient] = useState("all");
  const range = presetToRange(preset, customRange);
  const { logs } = useRangeLogs(user?.uid, range);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const clients = Array.from(new Set(projects.map((project) => project.client))).sort();
  const filteredLogs = logs.filter((log) => {
    const project = projectById.get(log.projectId);
    return (projectId === "all" || log.projectId === projectId) && (client === "all" || project?.client === client);
  });

  return (
    <AppShell>
      <PageHeader title="Historia" subtitle="Wyszukuj, filtruj i edytuj zapisane wpisy." />
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={preset} onChange={(event) => setPreset(event.target.value as RangePreset)}>
            <option value="today">Dzisiaj</option>
            <option value="week">Ten tydzień</option>
            <option value="month">Ten miesiąc</option>
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
        </div>
        {preset === "custom" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={customRange.from} onChange={(event) => setCustomRange((value) => ({ ...value, from: event.target.value }))} />
            <Input type="date" value={customRange.to} onChange={(event) => setCustomRange((value) => ({ ...value, to: event.target.value }))} />
          </div>
        ) : null}
        {filteredLogs.length === 0 ? <EmptyState title="Brak wpisów w wybranym zakresie" /> : null}
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <LogCard key={log.id} log={log} project={projectById.get(log.projectId)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function presetToRange(preset: RangePreset, custom: DateRange): DateRange {
  if (preset === "today") return { from: todayKey(), to: todayKey() };
  if (preset === "week") return { from: startOfWeekKey(), to: todayKey() };
  if (preset === "month") return { from: startOfMonthKey(), to: todayKey() };
  const previous = previousMonthRange();
  return custom.from && custom.to ? custom : previous;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogCard } from "@/components/logs/log-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { dateKeyToDate, endOfMonthKey, formatDayHeading, formatDuration, monthLabel, startOfMonthKey, todayKey } from "@/lib/utils/date";
import type { WorkLog } from "@/types/domain";

export default function HistoryPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [monthOffset, setMonthOffset] = useState(0);
  const [projectId, setProjectId] = useState("all");
  const [saved, setSaved] = useState(false);

  const monthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const range = { from: startOfMonthKey(monthDate), to: endOfMonthKey(monthDate) };
  const { logs, loading } = useRangeLogs(user?.uid, range);
  const projectById = new Map(projects.map((project) => [project.id, project]));

  useEffect(() => {
    if (window.location.search.includes("saved=1")) {
      setSaved(true);
      window.history.replaceState(null, "", "/history");
      const id = window.setTimeout(() => setSaved(false), 4000);
      return () => window.clearTimeout(id);
    }
  }, []);

  const filtered = logs.filter((log) => projectId === "all" || log.projectId === projectId);
  const total = filtered.reduce((sum, log) => sum + log.durationMinutes, 0);
  const days = useMemo(() => {
    const map = new Map<string, WorkLog[]>();
    filtered.forEach((log) => map.set(log.dateKey, [...(map.get(log.dateKey) ?? []), log]));
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, dayLogs]) => ({
        dateKey,
        logs: dayLogs.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        minutes: dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0),
      }));
  }, [filtered]);
  const isCurrentMonth = startOfMonthKey(monthDate) === startOfMonthKey(dateKeyToDate(todayKey()));

  return (
    <AppShell>
      <PageHeader
        title="Historia"
        action={
          <Link className={buttonClass("primary")} href="/dzien">
            <Plus className="h-5 w-5" />
            Dodaj
          </Link>
        }
      />

      {saved ? (
        <p className="mb-4 flex items-center gap-2 rounded-box bg-go-soft px-4 py-3 text-[17px] font-semibold text-go" role="status">
          <CheckCircle2 className="h-5 w-5" />
          Zmiany zapisane
        </p>
      ) : null}

      <div className="panel mb-3 flex items-center justify-between p-1.5">
        <button aria-label="Poprzedni miesiąc" className="flex h-12 w-12 items-center justify-center rounded-lg hover:bg-well" onClick={() => setMonthOffset((v) => v - 1)} type="button">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className="text-[17px] font-semibold text-ink">{monthLabel(range.from)}</p>
          <p className="text-sm text-steel">razem {formatDuration(total)}</p>
        </div>
        <button
          aria-label="Następny miesiąc"
          className="flex h-12 w-12 items-center justify-center rounded-lg hover:bg-well disabled:opacity-30"
          disabled={isCurrentMonth}
          onClick={() => setMonthOffset((v) => v + 1)}
          type="button"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <Select aria-label="Budowa" className="mb-6" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
        <option value="all">Wszystkie budowy</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>

      {loading ? <SkeletonList /> : null}
      {!loading && days.length === 0 ? (
        <EmptyState
          title="Brak wpisów w tym miesiącu"
          body={projectId !== "all" ? "Spróbuj wybrać „Wszystkie budowy”." : "Dodaj wpis albo przejdź do innego miesiąca strzałkami."}
        />
      ) : null}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.dateKey}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold text-ink">{formatDayHeading(day.dateKey)}</h2>
              <p className="font-cond text-lg font-bold text-steel">{formatDuration(day.minutes)}</p>
            </div>
            <div className="space-y-2">
              {day.logs.map((log) => (
                <LogCard key={log.id} log={log} project={projectById.get(log.projectId)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

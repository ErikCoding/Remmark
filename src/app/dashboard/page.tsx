"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { LogCard } from "@/components/logs/log-card";
import { BarChart } from "@/components/stats/bar-chart";
import { TimerPanel } from "@/components/timer/timer-panel";
import { buttonClass } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { daysInRange, endOfWeekKey, formatDuration, formatLongDate, startOfWeekKey, todayKey, weekdayShort } from "@/lib/utils/date";

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const today = todayKey();
  const week = { from: startOfWeekKey(), to: endOfWeekKey() };
  const { logs, loading } = useRangeLogs(user?.uid, week);
  const [saved, setSaved] = useState(false);
  const projectById = new Map(projects.map((project) => [project.id, project]));

  useEffect(() => {
    if (window.location.search.includes("saved=1")) {
      setSaved(true);
      window.history.replaceState(null, "", "/dashboard");
      const id = window.setTimeout(() => setSaved(false), 4000);
      return () => window.clearTimeout(id);
    }
  }, []);

  const todayLogs = logs.filter((log) => log.dateKey === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayTotal = todayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const weekTotal = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const weekDaysWorked = new Set(logs.map((log) => log.dateKey)).size;
  const bars = daysInRange(week).map((dateKey) => ({
    key: dateKey,
    label: weekdayShort(dateKey).replace(".", ""),
    minutes: logs.filter((log) => log.dateKey === dateKey).reduce((sum, log) => sum + log.durationMinutes, 0),
    highlight: dateKey === today,
  }));
  const title = formatLongDate(new Date());

  return (
    <AppShell>
      <h1 className="mb-4 font-cond text-[34px] font-bold leading-none text-ink">{title.charAt(0).toUpperCase() + title.slice(1)}</h1>

      {saved ? (
        <p className="mb-4 flex items-center gap-2 rounded-box bg-go-soft px-4 py-3 text-[17px] font-semibold text-go" role="status">
          <CheckCircle2 className="h-5 w-5" />
          Dzień zapisany
        </p>
      ) : null}

      <div className="space-y-8">
        {user ? <TimerPanel userId={user.uid} projects={projects} /> : null}

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="section-title">Dzisiaj</h2>
            {todayTotal ? <p className="font-cond text-2xl font-bold text-ink">{formatDuration(todayTotal)}</p> : null}
          </div>
          {loading ? <SkeletonList rows={1} /> : null}
          {!loading && todayLogs.length === 0 ? (
            <p className="text-[15px] text-steel">Nic jeszcze nie zapisano. Po „Kończę” albo ręcznym wpisie miejsca z dzisiaj pojawią się tutaj.</p>
          ) : null}
          <div className="space-y-2">
            {todayLogs.map((log) => (
              <LogCard key={log.id} log={log} project={projectById.get(log.projectId)} />
            ))}
          </div>
          {todayLogs.length > 0 ? (
            <Link className={`${buttonClass("ghost")} mt-1 -ml-2`} href={`/dzien?data=${today}`}>
              <PenLine className="h-5 w-5" />
              Popraw albo dopisz miejsca
            </Link>
          ) : null}
        </section>

        <section className="panel p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="section-title">Ten tydzień</h2>
              <p className="text-[15px] text-steel">
                {weekDaysWorked} {weekDaysWorked === 1 ? "dzień" : "dni"} pracy
              </p>
            </div>
            <p className="font-cond text-[34px] font-bold leading-none text-ink">{formatDuration(weekTotal)}</p>
          </div>
          <div className="pt-5"><BarChart bars={bars} height={110} /></div>
          <Link className={`${buttonClass("secondary", "md", true)} mt-4`} href="/reports?okres=tydzien">
            Raport i statystyki
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

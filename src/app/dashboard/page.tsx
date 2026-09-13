"use client";

import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogCard } from "@/components/logs/log-card";
import { TimerPanel } from "@/components/timer/timer-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { formatDuration, formatLongDate, startOfMonthKey, startOfWeekKey, todayKey } from "@/lib/utils/date";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { projects } = useProjects();
  const monthRange = { from: startOfMonthKey(), to: todayKey() };
  const { logs, loading } = useRangeLogs(user?.uid, monthRange);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const today = todayKey();
  const weekStart = startOfWeekKey();
  const stats = {
    today: logs.filter((log) => log.dateKey === today).reduce((sum, log) => sum + log.durationMinutes, 0),
    week: logs.filter((log) => log.dateKey >= weekStart).reduce((sum, log) => sum + log.durationMinutes, 0),
    month: logs.reduce((sum, log) => sum + log.durationMinutes, 0),
    activeProjects: projects.filter((project) => project.status === "active").length,
  };
  const recentLogs = [...logs].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startTime.localeCompare(a.startTime)).slice(0, 5);

  return (
    <AppShell>
      <PageHeader title="Dzień dobry" subtitle={`${profile?.name ?? "Remmark"} · ${formatLongDate(new Date())}`} />
      <div className="space-y-6">
        <Link href="/logs/new">
          <Button className="min-h-16 text-base" full>
            + Dodaj wpis z budowy
          </Button>
        </Link>
        {user ? <TimerPanel userId={user.uid} projects={projects.filter((project) => project.status === "active")} /> : null}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Dzisiaj" value={formatDuration(stats.today)} />
          <StatCard label="Ten tydzień" value={formatDuration(stats.week)} />
          <StatCard label="Ten miesiąc" value={formatDuration(stats.month)} />
          <StatCard label="Aktywne budowy" value={String(stats.activeProjects)} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Ostatnie wpisy</h2>
            <Link className="text-sm font-semibold text-brand-700" href="/history">
              Historia
            </Link>
          </div>
          {loading ? <SkeletonList /> : null}
          {!loading && recentLogs.length === 0 ? (
            <EmptyState title="Nie ma jeszcze wpisów" body="Dodaj pierwszy wpis albo rozpocznij pracę timerem." />
          ) : null}
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <LogCard key={log.id} log={log} project={projectById.get(log.projectId)} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

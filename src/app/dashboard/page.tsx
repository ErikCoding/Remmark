"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, FileText, Plus, TimerReset, type LucideIcon } from "lucide-react";
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
      <PageHeader title="Dzień dobry, Panie Marku 👋" subtitle={`${profile?.name ?? "Remmark"} · ${formatLongDate(new Date())}`} />
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="surface overflow-hidden p-5 md:p-6">
            <div>
              <p className="eyebrow">Start pracy</p>
              <h2 className="mt-2 max-w-xl text-3xl font-black leading-[1.05] text-ink md:text-4xl">Co chcesz zapisać?</h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted">Najkrótsza ścieżka: ręczny wpis po pracy albo timer, gdy zaczynasz teraz.</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link className="tap-highlight rounded-2xl bg-ink p-4 text-white shadow-[0_18px_38px_rgba(18,24,38,0.22)]" href="/logs/new">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-lg font-black">Dodaj wpis</span>
                <span className="mt-1 block text-sm font-medium text-white/70">Godziny, opis i budowa</span>
              </Link>
              <Link className="tap-highlight rounded-2xl border border-slate-200 bg-white p-4 text-ink shadow-[0_12px_30px_rgba(15,23,42,0.06)]" href="/reports">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-lg font-black">Raport</span>
                <span className="mt-1 block text-sm font-medium text-muted">PDF, CSV lub druk</span>
              </Link>
            </div>
          </div>
          <div className="surface-flat p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="eyebrow">Dzisiaj</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-ink">{formatDuration(stats.today)}</p>
            <p className="mt-1 text-sm font-semibold text-muted">zapisanej pracy</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniStat label="Tydzień" value={formatDuration(stats.week)} />
              <MiniStat label="Budowy" value={String(stats.activeProjects)} />
            </div>
          </div>
        </section>
        {user ? <TimerPanel userId={user.uid} projects={projects.filter((project) => project.status === "active")} /> : null}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Clock3} label="Dzisiaj" value={formatDuration(stats.today)} />
          <StatCard icon={CalendarDays} label="Ten tydzień" value={formatDuration(stats.week)} />
          <StatCard icon={TimerReset} label="Ten miesiąc" value={formatDuration(stats.month)} />
          <StatCard icon={BriefcaseBusiness} label="Aktywne budowy" value={String(stats.activeProjects)} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink">Ostatnie wpisy</h2>
            <Link className="inline-flex items-center gap-1 text-sm font-bold text-brand-700" href="/history">
              Historia
              <ArrowRight className="h-4 w-4" />
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

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="surface-flat p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-ink">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

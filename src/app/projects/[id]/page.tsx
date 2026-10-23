"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogCard } from "@/components/logs/log-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { subscribeProjectLogs } from "@/lib/services/logs";
import { formatDayHeading, formatDuration, formatKey } from "@/lib/utils/date";
import type { WorkLog } from "@/types/domain";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const project = projects.find((item) => item.id === params.id);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeProjectLogs(
      user.uid,
      params.id,
      (next) => {
        setLogs(next);
        setLogsLoading(false);
      },
      () => setLogsLoading(false),
    );
  }, [params.id, user]);

  const summary = useMemo(() => {
    const days = new Set(logs.map((log) => log.dateKey));
    const keys = Array.from(days).sort();
    return {
      minutes: logs.reduce((sum, log) => sum + log.durationMinutes, 0),
      days: days.size,
      first: keys[0],
      last: keys[keys.length - 1],
    };
  }, [logs]);

  if (!loading && !project) {
    return (
      <AppShell>
        <PageHeader backHref="/projects" title="Budowa" />
        <EmptyState title="Nie znaleziono budowy" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader backHref="/projects" title={project?.name ?? "Budowa"} />
      {!project ? <SkeletonList rows={2} /> : null}

      {project && editing ? (
        <div className="mb-6">
          <ProjectForm onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} project={project} />
        </div>
      ) : null}

      {project && !editing ? (
        <section className="panel mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5 text-[15px]">
              <StatusPill status={project.status} />
              {project.client ? <p className="pt-1 text-ink">{project.client}</p> : null}
              {project.address ? <p className="text-steel">{project.address}</p> : null}
              {project.projectNumber ? <p className="text-steel">Nr zlecenia: {project.projectNumber}</p> : null}
            </div>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edytuj
            </Button>
          </div>
          {project.notes ? <p className="mt-3 whitespace-pre-line rounded-lg bg-well p-3 text-[15px] text-ink">{project.notes}</p> : null}

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
            <div>
              <dt className="text-sm text-steel">Łącznie</dt>
              <dd className="font-cond text-2xl font-bold text-ink">{formatDuration(summary.minutes)}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel">Dni pracy</dt>
              <dd className="font-cond text-2xl font-bold text-ink">{summary.days}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel">Ostatnio</dt>
              <dd className="font-cond text-2xl font-bold text-ink">{summary.last ? formatKey(summary.last).slice(0, 5) : "–"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {project ? (
        <div className="mb-8 grid grid-cols-2 gap-2">
          <Link className={buttonClass("vis")} href={`/dzien?projectId=${project.id}`}>
            <Plus className="h-5 w-5" />
            Dodaj wpis
          </Link>
          <Link className={buttonClass("secondary")} href={`/reports?okres=wszystko&budowa=${project.id}`}>
            <FileText className="h-5 w-5" />
            Raport budowy
          </Link>
        </div>
      ) : null}

      <h2 className="section-title mb-2.5">Wpisy z tej budowy</h2>
      {logsLoading ? <SkeletonList /> : null}
      {!logsLoading && logs.length === 0 ? <EmptyState title="Brak wpisów" body="Godziny z tej budowy pojawią się tutaj." /> : null}
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id}>
            <p className="mb-1 mt-3 text-sm font-semibold text-steel">{formatDayHeading(log.dateKey)}</p>
            <LogCard log={log} showProject={false} />
          </div>
        ))}
      </div>
      {summary.first ? <p className="mt-6 text-center text-sm text-steel">Pierwszy wpis: {formatKey(summary.first)}</p> : null}
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogCard } from "@/components/logs/log-card";
import { ProjectForm } from "@/components/projects/project-form";
import { TimerPanel } from "@/components/timer/timer-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { formatDuration } from "@/lib/utils/date";
import { getProject } from "@/lib/services/projects";
import { subscribeProjectLogs } from "@/lib/services/logs";
import type { Project, WorkLog } from "@/types/domain";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { projects } = useProjects();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [editing, setEditing] = useState(false);
  const totalMinutes = useMemo(() => logs.reduce((sum, log) => sum + log.durationMinutes, 0), [logs]);

  useEffect(() => {
    void getProject(params.id).then(setProject);
    const unsubscribe = subscribeProjectLogs(params.id, setLogs, () => undefined);
    return () => unsubscribe();
  }, [params.id]);

  return (
    <AppShell>
      <PageHeader
        title={project?.name ?? "Budowa"}
        subtitle={project ? `${project.client} · ${project.address}` : "Ładowanie danych budowy"}
        action={<Button variant="secondary" onClick={() => setEditing((visible) => !visible)}>{editing ? "Zamknij" : "Edytuj"}</Button>}
      />
      <div className="space-y-5">
        {project && editing ? <ProjectForm project={project} onSaved={() => setEditing(false)} /> : null}
        {project ? (
          <section className="surface-flat p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info label="Status" value={project.status === "active" ? "Aktywna" : project.status === "paused" ? "Wstrzymana" : "Zakończona"} />
              <Info label="Wizyty" value={String(logs.length)} />
              <Info label="Łącznie" value={formatDuration(totalMinutes)} />
              <Info label="Numer" value={project.projectNumber || "-"} />
            </div>
            {project.notes ? <p className="mt-4 text-sm text-muted">{project.notes}</p> : null}
          </section>
        ) : null}
        {user && project ? <TimerPanel userId={user.uid} projects={projects.filter((item) => item.status === "active")} projectId={project.id} /> : null}
        <div className="flex gap-2">
          <Link className="flex-1" href={`/logs/new?projectId=${params.id}`}>
            <Button full>+ Dodaj wpis</Button>
          </Link>
        </div>
        <section>
          <h2 className="mb-3 text-xl font-black text-ink">Logi budowy</h2>
          {logs.length === 0 ? <EmptyState title="Brak wpisów dla tej budowy" /> : null}
          <div className="space-y-3">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} project={project ?? undefined} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

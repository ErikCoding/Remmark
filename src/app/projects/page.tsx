"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { todayKey } from "@/lib/utils/date";
import type { ProjectStats, ProjectStatus } from "@/types/domain";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { logs } = useRangeLogs(user?.uid, { from: "2020-01-01", to: todayKey() });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const stats = useMemo(() => {
    const map = new Map<string, ProjectStats>();
    logs.forEach((log) => {
      const current = map.get(log.projectId) ?? { projectId: log.projectId, visits: 0, totalMinutes: 0 };
      map.set(log.projectId, {
        projectId: log.projectId,
        visits: current.visits + 1,
        totalMinutes: current.totalMinutes + log.durationMinutes,
        lastVisitDate: current.lastVisitDate && current.lastVisitDate.seconds > log.date.seconds ? current.lastVisitDate : log.date,
      });
    });
    return map;
  }, [logs]);

  const filteredProjects = projects.filter((project) => {
    const text = `${project.name} ${project.client} ${project.address}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || project.status === status);
  });

  return (
    <AppShell>
      <PageHeader
        title="Budowy"
        subtitle="Lista projektów, statusy i historia wizyt."
        action={<Button onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Zamknij" : "Nowa"}</Button>}
      />
      <div className="space-y-4">
        {showForm ? <ProjectForm onSaved={() => setShowForm(false)} /> : null}
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie, kliencie lub adresie" />
          <Select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")}>
            <option value="all">Wszystkie statusy</option>
            <option value="active">Aktywne</option>
            <option value="paused">Wstrzymane</option>
            <option value="completed">Zakończone</option>
          </Select>
        </div>
        {filteredProjects.length === 0 ? <EmptyState title="Brak budów" body="Dodaj pierwszą budowę, aby zacząć logować czas." /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} stats={stats.get(project.id)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

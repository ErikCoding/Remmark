"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
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
        action={<Button onClick={() => setShowForm((visible) => !visible)}>{showForm ? "Zamknij" : <><Plus className="h-4 w-4" />Nowa</>}</Button>}
      />
      <div className="space-y-4">
        {showForm ? <ProjectForm onSaved={() => setShowForm(false)} /> : null}
        <div className="tool-panel space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie, kliencie lub adresie" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: "all", label: "Wszystkie" },
              { value: "active", label: "Aktywne" },
              { value: "paused", label: "Wstrzymane" },
              { value: "completed", label: "Zakończone" },
            ].map((item) => (
              <button
                className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
                  status === item.value ? "bg-ink text-white shadow-[0_12px_24px_rgba(18,24,38,0.16)]" : "bg-white text-muted hover:text-ink"
                }`}
                key={item.value}
                onClick={() => setStatus(item.value as ProjectStatus | "all")}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
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

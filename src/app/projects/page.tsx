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
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { useRangeLogs } from "@/hooks/use-range-logs";
import { todayKey } from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";

type Filter = "open" | "all";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const { logs } = useRangeLogs(user?.uid, { from: "2000-01-01", to: todayKey() });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [adding, setAdding] = useState(false);

  const stats = useMemo(() => {
    const map = new Map<string, { minutes: number; last?: string }>();
    logs.forEach((log) => {
      const current = map.get(log.projectId) ?? { minutes: 0 };
      map.set(log.projectId, {
        minutes: current.minutes + log.durationMinutes,
        last: !current.last || log.dateKey > current.last ? log.dateKey : current.last,
      });
    });
    return map;
  }, [logs]);

  const text = query.trim().toLowerCase();
  const visible = projects.filter(
    (project) =>
      (filter === "all" || project.status !== "completed") &&
      `${project.name} ${project.client} ${project.address}`.toLowerCase().includes(text),
  );
  const closedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <AppShell>
      <PageHeader
        title="Budowy"
        action={
          !adding ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-5 w-5" />
              Nowa
            </Button>
          ) : null
        }
      />

      {adding ? (
        <div className="mb-6">
          <ProjectForm onCancel={() => setAdding(false)} onSaved={() => setAdding(false)} />
        </div>
      ) : null}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" />
        <Input aria-label="Szukaj budowy" className="pl-11" placeholder="Szukaj po nazwie, kliencie, adresie" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button className={classNames("chip", filter === "open" && "chip-on")} onClick={() => setFilter("open")} type="button">
          W toku
        </button>
        <button className={classNames("chip", filter === "all" && "chip-on")} onClick={() => setFilter("all")} type="button">
          Wszystkie{closedCount ? ` (+${closedCount} zakończ.)` : ""}
        </button>
      </div>

      {loading ? <SkeletonList /> : null}
      {!loading && visible.length === 0 ? (
        <EmptyState
          title={projects.length ? "Nic nie pasuje" : "Nie ma jeszcze budów"}
          body={projects.length ? "Zmień wyszukiwanie albo pokaż wszystkie." : "Dodaj pierwszą budowę przyciskiem „Nowa”."}
        />
      ) : null}
      <div className="space-y-2">
        {visible.map((project) => (
          <ProjectCard key={project.id} lastDateKey={stats.get(project.id)?.last} minutes={stats.get(project.id)?.minutes ?? 0} project={project} />
        ))}
      </div>
    </AppShell>
  );
}

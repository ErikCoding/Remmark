import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDuration, formatShortDate } from "@/lib/utils/date";
import type { Project, ProjectStats } from "@/types/domain";

export function ProjectCard({ project, stats }: { project: Project; stats?: ProjectStats }) {
  return (
    <Link className="block rounded-lg border border-line bg-white p-4 transition hover:border-brand-100 hover:shadow-soft" href={`/projects/${project.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-ink">{project.name}</h2>
          <p className="mt-1 truncate text-sm text-muted">{project.address}</p>
          <p className="mt-1 truncate text-sm text-muted">{project.client}</p>
        </div>
        <StatusPill status={project.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Stat label="Wizyty" value={String(stats?.visits ?? 0)} />
        <Stat label="Godziny" value={formatDuration(stats?.totalMinutes ?? 0)} />
        <Stat
          label="Ostatnio"
          value={stats?.lastVisitDate ? formatShortDate(stats.lastVisitDate.toDate()) : "-"}
        />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper px-2 py-2">
      <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 truncate font-bold text-ink">{value}</p>
    </div>
  );
}

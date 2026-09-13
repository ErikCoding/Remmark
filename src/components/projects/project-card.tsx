import Link from "next/link";
import { Clock3, MapPin, UsersRound } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDuration, formatShortDate } from "@/lib/utils/date";
import type { Project, ProjectStats } from "@/types/domain";

export function ProjectCard({ project, stats }: { project: Project; stats?: ProjectStats }) {
  return (
    <Link className="group block rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]" href={`/projects/${project.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black text-ink">{project.name}</h2>
          <p className="mt-2 flex items-center gap-1.5 truncate text-sm font-medium text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {project.address}
          </p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-muted">
            <UsersRound className="h-3.5 w-3.5 shrink-0" />
            {project.client}
          </p>
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
    <div className="rounded-xl bg-slate-50 px-2.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="mt-1 truncate font-black text-ink">{value}</p>
    </div>
  );
}

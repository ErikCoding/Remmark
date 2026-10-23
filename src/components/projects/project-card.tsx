import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDuration, formatKey } from "@/lib/utils/date";
import type { Project } from "@/types/domain";

export function ProjectCard({ project, minutes, lastDateKey }: { project: Project; minutes: number; lastDateKey?: string }) {
  return (
    <Link className="panel flex items-center gap-3 p-4 transition-colors hover:border-steel" href={`/projects/${project.id}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[17px] font-semibold text-ink">{project.name}</p>
          {project.status !== "active" ? <StatusPill status={project.status} /> : null}
        </div>
        {project.client || project.address ? (
          <p className="truncate text-[15px] text-steel">{[project.client, project.address].filter(Boolean).join(", ")}</p>
        ) : null}
        <p className="mt-1 text-sm text-steel">
          {minutes ? `${formatDuration(minutes)} łącznie` : "Jeszcze bez godzin"}
          {lastDateKey ? ` · ostatnio ${formatKey(lastDateKey)}` : ""}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-steel" />
    </Link>
  );
}

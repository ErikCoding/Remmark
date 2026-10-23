import Link from "next/link";
import { logBreak } from "@/lib/services/logs";
import { formatDuration } from "@/lib/utils/date";
import type { Project, WorkLog } from "@/types/domain";

/** Jeden wpis na liście – całość jest przyciskiem do edycji. */
export function LogCard({ log, project, showProject = true }: { log: WorkLog; project?: Project; showProject?: boolean }) {
  const breakMinutes = logBreak(log);
  return (
    <Link className="panel flex gap-3 p-3.5 transition-colors hover:border-steel" href={`/dzien?data=${log.dateKey}`}>
      <div className="w-[68px] shrink-0 border-r border-line pr-3">
        <p className="font-cond text-xl font-semibold leading-tight text-ink">{log.startTime}</p>
        <p className="font-cond text-xl font-semibold leading-tight text-steel">{log.endTime}</p>
      </div>
      <div className="min-w-0 flex-1">
        {showProject ? <p className="truncate text-[17px] font-semibold text-ink">{project?.name ?? "Usunięta budowa"}</p> : null}
        {log.descriptionPL ? (
          <p className="line-clamp-2 text-[15px] leading-snug text-steel">{log.descriptionPL}</p>
        ) : (
          <p className="text-[15px] italic text-[#98a2ab]">Bez opisu</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-cond text-xl font-bold text-ink">{formatDuration(log.durationMinutes)}</p>
        {breakMinutes ? <p className="text-sm text-steel">przerwa {breakMinutes} min</p> : null}
      </div>
    </Link>
  );
}

import Link from "next/link";
import { formatDuration, formatShortDate } from "@/lib/utils/date";
import type { Project, WorkLog } from "@/types/domain";

export function LogCard({ log, project }: { log: WorkLog; project?: Project }) {
  const date = log.date?.toDate ? formatShortDate(log.date.toDate()) : log.dateKey;

  return (
    <Link className="block rounded-lg border border-line bg-white p-4 transition hover:border-brand-100 hover:shadow-soft" href={`/logs/${log.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-ink">{project?.name ?? "Budowa"}</h3>
          <p className="mt-1 text-sm text-muted">{date}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-ink">
            {log.startTime} - {log.endTime}
          </p>
          <p className="mt-1 text-muted">{formatDuration(log.durationMinutes)}</p>
        </div>
      </div>
      {log.descriptionPL ? <p className="mt-3 line-clamp-2 text-sm text-ink">{log.descriptionPL}</p> : null}
    </Link>
  );
}

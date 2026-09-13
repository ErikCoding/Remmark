import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import { formatDuration, formatShortDate } from "@/lib/utils/date";
import type { Project, WorkLog } from "@/types/domain";

export function LogCard({ log, project }: { log: WorkLog; project?: Project }) {
  const date = log.date?.toDate ? formatShortDate(log.date.toDate()) : log.dateKey;

  return (
    <Link className="group block rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]" href={`/logs/${log.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-ink">{project?.name ?? "Budowa"}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {date}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-right text-sm">
          <p className="whitespace-nowrap font-black text-ink">
            {log.startTime} - {log.endTime}
          </p>
          <p className="mt-1 inline-flex items-center justify-end gap-1 text-muted">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDuration(log.durationMinutes)}
          </p>
        </div>
      </div>
      {log.descriptionPL ? <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-slate-700">{log.descriptionPL}</p> : null}
    </Link>
  );
}

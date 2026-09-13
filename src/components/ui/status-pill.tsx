import type { ProjectStatus } from "@/types/domain";

const labels: Record<ProjectStatus, string> = {
  active: "Aktywna",
  paused: "Wstrzymana",
  completed: "Zakończona",
};

const classes: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-success ring-1 ring-emerald-100",
  paused: "bg-amber-50 text-warning ring-1 ring-amber-100",
  completed: "bg-slate-100 text-muted ring-1 ring-slate-200",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${classes[status]}`}>{labels[status]}</span>;
}

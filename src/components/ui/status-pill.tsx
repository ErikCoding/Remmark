import type { ProjectStatus } from "@/types/domain";

const labels: Record<ProjectStatus, string> = {
  active: "Aktywna",
  paused: "Wstrzymana",
  completed: "Zakończona",
};

const classes: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-success",
  paused: "bg-amber-50 text-warning",
  completed: "bg-slate-100 text-muted",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>{labels[status]}</span>;
}

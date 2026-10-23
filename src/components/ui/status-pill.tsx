import type { ProjectStatus } from "@/types/domain";

const map: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: "W toku", className: "bg-go-soft text-go" },
  paused: { label: "Wstrzymana", className: "bg-vis-soft text-vis-dark" },
  completed: { label: "Zakończona", className: "bg-well text-steel" },
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const item = map[status] ?? map.active;
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-sm font-semibold ${item.className}`}>{item.label}</span>;
}

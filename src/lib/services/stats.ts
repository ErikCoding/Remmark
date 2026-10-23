import { logBreak } from "@/lib/services/logs";
import { daysInRange, timeToMinutes } from "@/lib/utils/date";
import type { DateRange, Project, WorkLog } from "@/types/domain";

export type ProjectTotal = { projectId: string; name: string; client: string; minutes: number; days: number; entries: number };
export type DayTotal = { dateKey: string; minutes: number; breakMinutes: number; entries: number };
export type MonthTotal = { monthKey: string; minutes: number; days: number };

export type PeriodStats = {
  totalMinutes: number;
  totalBreakMinutes: number;
  entries: number;
  daysWorked: number;
  avgPerDay: number;
  longestDay?: DayTotal;
  avgStart?: string;
  avgEnd?: string;
  projectCount: number;
  byProject: ProjectTotal[];
  byDay: DayTotal[];
};

const minutesToTime = (value: number) => {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
};

export function computeStats(logs: WorkLog[], projects: Project[], range?: DateRange): PeriodStats {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const dayMap = new Map<string, DayTotal>();
  const projectMap = new Map<string, ProjectTotal & { dayKeys: Set<string> }>();
  let totalMinutes = 0;
  let totalBreakMinutes = 0;

  logs.forEach((log) => {
    totalMinutes += log.durationMinutes;
    totalBreakMinutes += logBreak(log);

    const day = dayMap.get(log.dateKey) ?? { dateKey: log.dateKey, minutes: 0, breakMinutes: 0, entries: 0 };
    day.minutes += log.durationMinutes;
    day.breakMinutes += logBreak(log);
    day.entries += 1;
    dayMap.set(log.dateKey, day);

    const project = projectById.get(log.projectId);
    const current = projectMap.get(log.projectId) ?? {
      projectId: log.projectId,
      name: project?.name ?? "Usunięta budowa",
      client: project?.client ?? "",
      minutes: 0,
      days: 0,
      entries: 0,
      dayKeys: new Set<string>(),
    };
    current.minutes += log.durationMinutes;
    current.entries += 1;
    current.dayKeys.add(log.dateKey);
    current.days = current.dayKeys.size;
    projectMap.set(log.projectId, current);
  });

  // Średni start = najwcześniejszy start dnia, średni koniec = najpóźniejszy koniec dnia.
  const firstStarts: number[] = [];
  const lastEnds: number[] = [];
  const byDateKey = new Map<string, WorkLog[]>();
  logs.forEach((log) => byDateKey.set(log.dateKey, [...(byDateKey.get(log.dateKey) ?? []), log]));
  byDateKey.forEach((dayLogs) => {
    firstStarts.push(Math.min(...dayLogs.map((log) => timeToMinutes(log.startTime))));
    lastEnds.push(
      Math.max(
        ...dayLogs.map((log) => {
          const end = timeToMinutes(log.endTime);
          return end <= timeToMinutes(log.startTime) ? end + 1440 : end;
        }),
      ),
    );
  });
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const worked = Array.from(dayMap.values());
  const byDay = range
    ? daysInRange(range).map((dateKey) => dayMap.get(dateKey) ?? { dateKey, minutes: 0, breakMinutes: 0, entries: 0 })
    : worked.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    totalMinutes,
    totalBreakMinutes,
    entries: logs.length,
    daysWorked: worked.length,
    avgPerDay: worked.length ? totalMinutes / worked.length : 0,
    longestDay: worked.reduce<DayTotal | undefined>((best, day) => (!best || day.minutes > best.minutes ? day : best), undefined),
    avgStart: firstStarts.length ? minutesToTime(average(firstStarts)) : undefined,
    avgEnd: lastEnds.length ? minutesToTime(average(lastEnds)) : undefined,
    projectCount: projectMap.size,
    byProject: Array.from(projectMap.values())
      .map(({ dayKeys: _dayKeys, ...rest }) => rest)
      .sort((a, b) => b.minutes - a.minutes),
    byDay,
  };
}

export function monthlyTotals(logs: WorkLog[]): MonthTotal[] {
  const map = new Map<string, { minutes: number; days: Set<string> }>();
  logs.forEach((log) => {
    const monthKey = `${log.dateKey.slice(0, 7)}-01`;
    const current = map.get(monthKey) ?? { minutes: 0, days: new Set<string>() };
    current.minutes += log.durationMinutes;
    current.days.add(log.dateKey);
    map.set(monthKey, current);
  });
  return Array.from(map.entries())
    .map(([monthKey, value]) => ({ monthKey, minutes: value.minutes, days: value.days.size }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

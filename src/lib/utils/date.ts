import type { DateRange } from "@/types/domain";

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function minutesBetween(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function formatDuration(minutes: number): string {
  const hours = minutes / 60;
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
  }).format(hours)} h`;
}

export function startOfWeekKey(date = new Date()): string {
  const current = new Date(date);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  current.setHours(0, 0, 0, 0);
  return toDateKey(current);
}

export function startOfMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function previousMonthRange(date = new Date()): DateRange {
  const from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const to = new Date(date.getFullYear(), date.getMonth(), 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function timeNow(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

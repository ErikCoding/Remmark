import type { DateRange } from "@/types/domain";

const pad = (value: number) => String(value).padStart(2, "0");

/** Klucz daty YYYY-MM-DD w czasie lokalnym (bez przesunięć UTC). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function dateKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(key: string, days: number): string {
  const date = dateKeyToDate(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatKey(key: string): string {
  return formatShortDate(dateKeyToDate(key));
}

export function formatDayHeading(key: string): string {
  const today = todayKey();
  if (key === today) return "Dzisiaj";
  if (key === addDays(today, -1)) return "Wczoraj";
  const label = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(dateKeyToDate(key));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekdayShort(key: string): string {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(dateKeyToDate(key));
}

export function monthLabel(key: string, withYear = true): string {
  const label = new Intl.DateTimeFormat("pl-PL", withYear ? { month: "long", year: "numeric" } : { month: "short" }).format(
    dateKeyToDate(key),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Minuty między godzinami. Jeśli koniec jest wcześniej niż start – zmiana przez północ. */
export function minutesBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (diff === 0) return 0;
  return diff > 0 ? diff : diff + 24 * 60;
}

export function netMinutes(startTime: string, endTime: string, breakMinutes = 0): number {
  return Math.max(0, minutesBetween(startTime, endTime) - (breakMinutes || 0));
}

/** "7 h 30 min" – czytelnie dla człowieka. */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** "7,5" – do tabel i eksportów. */
export function formatHoursDecimal(minutes: number): string {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(minutes / 60);
}

export function startOfWeekKey(date = new Date()): string {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  return toDateKey(current);
}

export function endOfWeekKey(date = new Date()): string {
  return addDays(startOfWeekKey(date), 6);
}

export function startOfMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

export function endOfMonthKey(date = new Date()): string {
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function previousMonthRange(date = new Date()): DateRange {
  const from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const to = new Date(date.getFullYear(), date.getMonth(), 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function previousWeekRange(date = new Date()): DateRange {
  const from = addDays(startOfWeekKey(date), -7);
  return { from, to: addDays(from, 6) };
}

export function timeNow(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function daysInRange(range: DateRange): string[] {
  const days: string[] = [];
  let cursor = range.from;
  let guard = 0;
  while (cursor <= range.to && guard < 800) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export function formatRange(range: DateRange): string {
  if (range.from === range.to) return formatKey(range.from);
  return `${formatKey(range.from)} – ${formatKey(range.to)}`;
}

export function isWeekend(key: string): boolean {
  const day = dateKeyToDate(key).getDay();
  return day === 0 || day === 6;
}

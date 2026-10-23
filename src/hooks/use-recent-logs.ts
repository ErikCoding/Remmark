"use client";

import { useRangeLogs } from "@/hooks/use-range-logs";
import { addDays, todayKey } from "@/lib/utils/date";

/** Wpisy z ostatnich dni (domyślnie 14). */
export function useRecentLogs(userId?: string, days = 14) {
  return useRangeLogs(userId, { from: addDays(todayKey(), -days), to: todayKey() });
}

"use client";

import { useEffect, useState } from "react";
import { subscribeLogsByRange } from "@/lib/services/logs";
import type { DateRange, WorkLog } from "@/types/domain";

export function useRangeLogs(userId: string | undefined, range: DateRange) {
  const { from, to } = range;
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeLogsByRange(
      userId,
      { from, to },
      (nextLogs) => {
        setLogs(nextLogs);
        setLoading(false);
      },
      () => {
        setError("Nie udało się pobrać wpisów z wybranego okresu.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [from, to, userId]);

  return { logs, loading, error };
}

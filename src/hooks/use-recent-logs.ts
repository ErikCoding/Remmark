"use client";

import { useEffect, useState } from "react";
import { subscribeRecentLogs } from "@/lib/services/logs";
import type { WorkLog } from "@/types/domain";

export function useRecentLogs(userId?: string, maxItems = 8) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeRecentLogs(
      userId,
      maxItems,
      (nextLogs) => {
        setLogs(nextLogs);
        setLoading(false);
      },
      () => {
        setError("Nie udało się pobrać ostatnich wpisów.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [maxItems, userId]);

  return { logs, loading, error };
}

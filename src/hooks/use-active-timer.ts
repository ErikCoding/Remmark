"use client";

import { useEffect, useState } from "react";
import { subscribeActiveTimer } from "@/lib/services/timers";
import type { ActiveTimer } from "@/types/domain";

export function useActiveTimer(userId?: string) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeActiveTimer(
      userId,
      (nextTimer) => {
        setTimer(nextTimer);
        setLoading(false);
      },
      () => {
        setError("Nie udało się pobrać aktywnego timera.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { timer, loading, error };
}

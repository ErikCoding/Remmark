"use client";

import { useEffect, useState } from "react";
import { subscribeProjects } from "@/lib/services/projects";
import type { Project } from "@/types/domain";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeProjects(
      (nextProjects) => {
        setProjects(nextProjects);
        setLoading(false);
      },
      () => {
        setError("Nie udało się pobrać budów.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { projects, loading, error };
}

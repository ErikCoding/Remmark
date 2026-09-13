"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogForm } from "@/components/logs/log-form";
import { useProjects } from "@/hooks/use-projects";

export default function NewLogPage() {
  return (
    <Suspense fallback={<NewLogFallback />}>
      <NewLogContent />
    </Suspense>
  );
}

function NewLogContent() {
  const searchParams = useSearchParams();
  const { projects } = useProjects();

  return (
    <AppShell>
      <PageHeader title="Nowy wpis" subtitle="Najkrótsza ścieżka do zapisania pracy z budowy." />
      <LogForm projects={projects} initialProjectId={searchParams.get("projectId") ?? undefined} />
    </AppShell>
  );
}

function NewLogFallback() {
  return (
    <AppShell>
      <PageHeader title="Nowy wpis" subtitle="Ładowanie formularza..." />
    </AppShell>
  );
}

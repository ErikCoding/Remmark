"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { DayEditor } from "@/components/day/day-editor";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useActiveTimer } from "@/hooks/use-active-timer";
import { useProjects } from "@/hooks/use-projects";

export default function DayPage() {
  return (
    <AppShell>
      <Suspense fallback={<SkeletonList />}>
        <DayContent />
      </Suspense>
    </AppShell>
  );
}

function DayContent() {
  const params = useSearchParams();
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const fromTimer = params.get("licznik") === "1";
  const { timer, loading: timerLoading } = useActiveTimer(fromTimer ? user?.uid : undefined);
  const date = params.get("data") ?? undefined;
  const editing = Boolean(date) && !fromTimer;

  return (
    <>
      <PageHeader backHref={editing ? "/history" : "/dashboard"} title={fromTimer && timer ? "Kończę pracę" : editing ? "Dzień pracy" : "Wpisz dzień"} />
      {loading || (fromTimer && timerLoading) ? (
        <SkeletonList rows={2} />
      ) : (
        <DayEditor
          initialDateKey={date}
          initialProjectId={params.get("projectId") ?? undefined}
          key={`${date ?? "new"}-${timer?.id ?? ""}`}
          projects={projects}
          timer={fromTimer ? timer : null}
        />
      )}
    </>
  );
}

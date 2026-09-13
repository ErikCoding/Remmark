"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { LogForm } from "@/components/logs/log-form";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";
import { deleteWorkLog, getWorkLog } from "@/lib/services/logs";
import type { WorkLog } from "@/types/domain";

export default function LogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects } = useProjects();
  const [log, setLog] = useState<WorkLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWorkLog(params.id).then(setLog);
  }, [params.id]);

  async function handleDelete() {
    const confirmed = window.confirm("Usunąć ten wpis? Tej operacji nie można cofnąć.");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteWorkLog(params.id);
      router.push("/history");
    } catch {
      setError("Nie udało się usunąć wpisu.");
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Szczegóły wpisu"
        subtitle="Edycja zapisanej pracy."
        action={
          <Button variant="danger" disabled={deleting} onClick={handleDelete}>
            Usuń
          </Button>
        }
      />
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {log ? <LogForm projects={projects} initialLog={log} /> : <p className="text-sm text-muted">Ładowanie wpisu...</p>}
    </AppShell>
  );
}

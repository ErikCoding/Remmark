"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { useActiveTimer } from "@/hooks/use-active-timer";
import { createWorkLog } from "@/lib/services/logs";
import { startTimer, stopTimer } from "@/lib/services/timers";
import { timeNow } from "@/lib/utils/date";
import type { Project } from "@/types/domain";

export function TimerPanel({ userId, projects, projectId }: { userId: string; projects: Project[]; projectId?: string }) {
  const router = useRouter();
  const { timer } = useActiveTimer(userId);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? projects[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentProject = projects.find((project) => project.id === timer?.projectId);

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projectId ?? projects[0].id);
    }
  }, [projectId, projects, selectedProjectId]);

  async function handleStart() {
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      await startTimer(userId, selectedProjectId);
    } catch {
      setError("Nie udało się rozpocząć pracy.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop(event: FormEvent) {
    event.preventDefault();
    if (!timer) return;
    setBusy(true);
    setError(null);
    try {
      await createWorkLog({
        projectId: timer.projectId,
        userId,
        dateKey: timer.dateKey,
        startTime: timer.startTime,
        endTime: timeNow(),
        descriptionPL: description,
        descriptionNL: "",
        notes: "",
        photos: [],
      });
      await stopTimer(userId);
      setDescription("");
      router.push("/dashboard");
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Nie udało się zakończyć pracy.");
    } finally {
      setBusy(false);
    }
  }

  if (timer) {
    return (
      <form className="rounded-lg border border-brand-100 bg-brand-50 p-4" onSubmit={handleStop}>
        <p className="text-sm font-semibold text-brand-700">Aktywna praca</p>
        <p className="mt-1 text-lg font-bold text-ink">{currentProject?.name ?? "Budowa"}</p>
        <p className="mt-1 text-sm text-muted">Start: {timer.startTime}</p>
        <Textarea
          className="mt-4"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Co robiłeś? Opcjonalnie"
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <Button className="mt-4" disabled={busy} full>
          {busy ? "Zapisywanie..." : "Zakończ pracę"}
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="font-bold text-ink">Timer pracy</p>
      <p className="mt-1 text-sm text-muted">Rozpocznij pracę teraz, a wpis zostanie zapisany po zakończeniu.</p>
      {!projectId ? (
        <Select className="mt-4" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <Button className="mt-4" disabled={busy || !selectedProjectId} onClick={handleStart} full>
        {busy ? "Start..." : "Rozpocznij pracę"}
      </Button>
    </div>
  );
}

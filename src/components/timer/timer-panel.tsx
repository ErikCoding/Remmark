"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Timer } from "lucide-react";
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
      <form className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-[0_14px_34px_rgba(22,128,60,0.08)]" onSubmit={handleStop}>
        <p className="inline-flex items-center gap-2 text-sm font-black text-success">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Aktywna praca
        </p>
        <p className="mt-2 text-xl font-black text-ink">{currentProject?.name ?? "Budowa"}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted">
          <Timer className="h-4 w-4" />
          Start: {timer.startTime}
        </p>
        <Textarea
          className="mt-4"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Co robiłeś? Opcjonalnie"
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <Button className="mt-4" disabled={busy} full>
          <Square className="h-4 w-4" />
          {busy ? "Zapisywanie..." : "Zakończ pracę"}
        </Button>
      </form>
    );
  }

  return (
    <div className="surface-flat p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink">
          <Timer className="h-5 w-5" />
        </span>
        <div>
          <p className="font-black text-ink">Timer pracy</p>
          <p className="mt-1 text-sm font-medium leading-5 text-muted">Rozpocznij pracę teraz, a wpis zostanie zapisany po zakończeniu.</p>
        </div>
      </div>
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
        <Play className="h-4 w-4" />
        {busy ? "Start..." : "Rozpocznij pracę"}
      </Button>
    </div>
  );
}

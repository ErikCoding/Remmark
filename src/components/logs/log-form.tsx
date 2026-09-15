"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, Languages, Mic, Plus, Save, StickyNote, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ProjectForm } from "@/components/projects/project-form";
import { useAuth } from "@/context/auth-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { createWorkLog, getSavedLogDefaults, updateWorkLog } from "@/lib/services/logs";
import { formatDuration, minutesBetween, todayKey } from "@/lib/utils/date";
import type { Project, WorkLog } from "@/types/domain";

export function LogForm({
  projects,
  initialLog,
  initialProjectId,
  timerDefaults,
}: {
  projects: Project[];
  initialLog?: WorkLog;
  initialProjectId?: string;
  timerDefaults?: { projectId: string; dateKey: string; startTime: string; endTime: string };
}) {
  const { user } = useAuth();
  const router = useRouter();
  const savedDefaults = useMemo(() => getSavedLogDefaults(), []);
  const [projectId, setProjectId] = useState(
    initialLog?.projectId ?? timerDefaults?.projectId ?? initialProjectId ?? savedDefaults.projectId ?? "",
  );
  const [dateKey, setDateKey] = useState(initialLog?.dateKey ?? timerDefaults?.dateKey ?? todayKey());
  const [startTime, setStartTime] = useState(initialLog?.startTime ?? timerDefaults?.startTime ?? savedDefaults.startTime);
  const [endTime, setEndTime] = useState(initialLog?.endTime ?? timerDefaults?.endTime ?? savedDefaults.endTime);
  const [descriptionPL, setDescriptionPL] = useState(initialLog?.descriptionPL ?? "");
  const [descriptionNL, setDescriptionNL] = useState(initialLog?.descriptionNL ?? "");
  const [notes, setNotes] = useState(initialLog?.notes ?? "");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const speech = useSpeechRecognition((text) => setDescriptionPL((current) => [current, text].filter(Boolean).join(" ")));

  const durationMinutes = minutesBetween(startTime, endTime);
  const orderedProjects = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status !== "completed");
    return [...activeProjects].sort((a, b) => {
      if (a.id === savedDefaults.projectId) return -1;
      if (b.id === savedDefaults.projectId) return 1;
      return a.name.localeCompare(b.name, "pl");
    });
  }, [projects, savedDefaults.projectId]);

  useEffect(() => {
    if (!projectId && orderedProjects[0]) setProjectId(orderedProjects[0].id);
  }, [orderedProjects, projectId]);

  async function translateDescription() {
    if (!descriptionPL.trim()) return;
    setTranslating(true);
    setError(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: descriptionPL, target: "nl" }),
      });
      const payload = (await response.json()) as { translatedText?: string; error?: string };
      if (!response.ok || !payload.translatedText) throw new Error(payload.error || "Nie udało się przetłumaczyć opisu.");
      setDescriptionNL(payload.translatedText);
    } catch (translateError) {
      setError(translateError instanceof Error ? translateError.message : "Nie udało się przetłumaczyć opisu.");
    } finally {
      setTranslating(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        projectId,
        userId: user.uid,
        dateKey,
        startTime,
        endTime,
        descriptionPL,
        descriptionNL,
        notes,
        photos: initialLog?.photos ?? [],
      };

      if (initialLog) {
        await updateWorkLog(initialLog.id, payload);
        setMessage("Wpis został zaktualizowany.");
      } else {
        await createWorkLog(payload);
        setMessage("Wpis został zapisany.");
      }

      router.push("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać wpisu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {showProjectForm ? (
        <ProjectForm
          compact
          onSaved={(newProjectId) => {
            setProjectId(newProjectId);
            setShowProjectForm(false);
          }}
        />
      ) : null}
      <form className="surface-flat space-y-5 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5" onSubmit={handleSubmit}>
        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-success">{message}</p> : null}
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
        <FormStep icon={BriefcaseBusiness} title="Budowa" caption="Wybierz miejsce pracy albo dodaj nowe w kilka sekund.">
          <Field label="Budowa">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
                <option value="">Wybierz budowę</option>
                {orderedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.id === savedDefaults.projectId ? "Ostatnio: " : ""}
                    {project.name} · {project.client}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="secondary" onClick={() => setShowProjectForm((visible) => !visible)}>
                <Plus className="h-4 w-4" />
                Nowa
              </Button>
            </div>
          </Field>
        </FormStep>

        <FormStep icon={CalendarClock} title="Czas pracy" caption="Godziny przeliczają się automatycznie.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} required />
            </Field>
            <Field label="Start">
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </Field>
            <Field label="Koniec">
              <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-muted">Czas pracy</span>
            <span className="text-lg font-black text-ink">{durationMinutes > 0 ? formatDuration(durationMinutes) : "sprawdź godziny"}</span>
          </div>
        </FormStep>

        <FormStep icon={StickyNote} title="Opis" caption="Krótko zapisz, co zostało zrobione. Możesz podyktować po polsku.">
          <Field label="Co robiłeś?">
            <div className="space-y-2">
              <Textarea
                value={descriptionPL}
                onChange={(event) => setDescriptionPL(event.target.value)}
                placeholder="Montaż profili, poprawki sufitu i przygotowanie ściany."
              />
              <div className="flex flex-wrap gap-2">
                {speech.supported ? (
                  <Button type="button" variant="secondary" onClick={speech.start}>
                    <Mic className="h-4 w-4" />
                    {speech.listening ? "Słucham..." : "Mikrofon"}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" disabled={translating || !descriptionPL.trim()} onClick={translateDescription}>
                  <Languages className="h-4 w-4" />
                  {translating ? "Tłumaczenie..." : "Przetłumacz na NL"}
                </Button>
              </div>
            </div>
          </Field>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Opis NL">
              <Textarea value={descriptionNL} onChange={(event) => setDescriptionNL(event.target.value)} placeholder="Niderlandzkie tłumaczenie" />
            </Field>
            <Field label="Notatka">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcjonalne dodatkowe informacje" />
            </Field>
          </div>
        </FormStep>
        <Button disabled={saving || durationMinutes <= 0} full>
          <Save className="h-4 w-4" />
          {saving ? "Zapisywanie..." : initialLog ? "Zapisz zmiany" : "Zapisz wpis"}
        </Button>
      </form>
    </div>
  );
}

function FormStep({
  icon: Icon,
  title,
  caption,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 md:p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-black text-ink">{title}</h2>
          <p className="mt-0.5 text-sm font-medium leading-5 text-muted">{caption}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

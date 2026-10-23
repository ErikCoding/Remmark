"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createProject, updateProject } from "@/lib/services/projects";
import { classNames } from "@/lib/utils/text";
import type { Project, ProjectStatus } from "@/types/domain";

const statuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "active", label: "W toku" },
  { value: "paused", label: "Wstrzymana" },
  { value: "completed", label: "Zakończona" },
];

export function ProjectForm({
  project,
  compact,
  onSaved,
  onCancel,
}: {
  project?: Project;
  compact?: boolean;
  onSaved?: (projectId: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [client, setClient] = useState(project?.client ?? "");
  const [address, setAddress] = useState(project?.address ?? "");
  const [projectNumber, setProjectNumber] = useState(project?.projectNumber ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    if (!name.trim()) {
      setError("Wpisz nazwę budowy.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        client: client.trim(),
        address: address.trim(),
        projectNumber: projectNumber.trim(),
        status,
        notes: notes.trim(),
      };
      if (project) {
        await updateProject(project.id, payload);
        onSaved?.(project.id);
      } else {
        onSaved?.(await createProject(payload));
      }
    } catch {
      setError("Nie udało się zapisać budowy. Sprawdź internet i spróbuj jeszcze raz.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={classNames("panel space-y-4 p-4", compact && "border-ink")} onSubmit={handleSubmit}>
      {compact ? <p className="section-title">Nowa budowa</p> : null}
      {error ? <p className="rounded-xl bg-stop-soft px-3 py-2 text-[15px] font-semibold text-stop">{error}</p> : null}
      <Field label="Nazwa budowy">
        <Input autoFocus={compact} value={name} onChange={(event) => setName(event.target.value)} placeholder="np. Kowalscy – łazienka" />
      </Field>
      <div className={classNames("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field label="Klient (opcjonalnie)">
          <Input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Imię, nazwisko lub firma" />
        </Field>
        <Field label="Adres (opcjonalnie)">
          <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ulica, miasto" />
        </Field>
      </div>
      {!compact ? (
        <>
          <Field label="Numer zlecenia (opcjonalnie)">
            <Input value={projectNumber} onChange={(event) => setProjectNumber(event.target.value)} />
          </Field>
          <div>
            <p className="mb-1.5 text-[15px] font-semibold text-ink">Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((item) => (
                <button
                  className={classNames("chip", status === item.value && "chip-on")}
                  key={item.value}
                  onClick={() => setStatus(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Notatki (opcjonalnie)">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Kod do bramy, telefon, materiały…" />
          </Field>
        </>
      ) : null}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving} type="submit">
          {saving ? "Zapisuję…" : project ? "Zapisz zmiany" : "Dodaj budowę"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
        ) : null}
      </div>
    </form>
  );
}

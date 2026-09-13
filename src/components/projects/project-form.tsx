"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createProject, updateProject } from "@/lib/services/projects";
import type { Project, ProjectStatus } from "@/types/domain";

export function ProjectForm({
  project,
  compact,
  onSaved,
}: {
  project?: Project;
  compact?: boolean;
  onSaved?: (projectId: string) => void;
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
    setError(null);

    if (!name.trim() || !client.trim() || !address.trim()) {
      setError("Nazwa, klient i adres są wymagane.");
      return;
    }

    setSaving(true);
    try {
      const payload = { name, client, address, projectNumber, status, notes };
      if (project) {
        await updateProject(project.id, payload);
        onSaved?.(project.id);
      } else {
        const projectId = await createProject(payload);
        onSaved?.(projectId);
        setName("");
        setClient("");
        setAddress("");
        setProjectNumber("");
        setStatus("active");
        setNotes("");
      }
    } catch {
      setError("Nie udało się zapisać budowy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4 rounded-lg border border-line bg-white p-4" onSubmit={handleSubmit}>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <div className={compact ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
        <Field label="Nazwa budowy">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Amsterdam - Keizersgracht 52" />
        </Field>
        <Field label="Klient">
          <Input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Nazwa klienta" />
        </Field>
        <Field label="Adres">
          <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ulica, miasto" />
        </Field>
        <Field label="Numer projektu">
          <Input value={projectNumber} onChange={(event) => setProjectNumber(event.target.value)} placeholder="Opcjonalnie" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
            <option value="active">Aktywna</option>
            <option value="paused">Wstrzymana</option>
            <option value="completed">Zakończona</option>
          </Select>
        </Field>
      </div>
      <Field label="Notatki">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcjonalne informacje o budowie" />
      </Field>
      <Button disabled={saving} full={compact}>
        {saving ? "Zapisywanie..." : project ? "Zapisz zmiany" : "Dodaj budowę"}
      </Button>
    </form>
  );
}

"use client";

import { useId, useMemo, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/field";
import { findProjectByName, suggestPlaces } from "@/lib/services/places";
import { classNames } from "@/lib/utils/text";
import type { Place, Project } from "@/types/domain";

/**
 * Pole „Gdzie?”: wpisujesz nazwę, a pod spodem pojawiają się pasujące miejsca.
 * Puste pole po dotknięciu pokazuje kilka ostatnio używanych. Nowa nazwa zostanie dodana przy zapisie.
 */
export function PlaceInput({
  projects,
  recentIds,
  value,
  onChange,
  autoFocus,
  placeholder = "Wpisz, gdzie byłeś – np. Kowalscy, Rumia",
  label = "Gdzie?",
  hideLabel,
}: {
  projects: Project[];
  recentIds: string[];
  value: Place | null;
  onChange: (place: Place | null) => void;
  autoFocus?: boolean;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const linked = value?.projectId ? projects.find((project) => project.id === value.projectId) : undefined;
  const text = value?.name || linked?.name || "";
  const suggestions = useMemo(() => suggestPlaces(projects, text, recentIds), [projects, recentIds, text]);
  const exact = findProjectByName(projects, text);
  const isNew = Boolean(text.trim()) && !linked && !exact;

  function pick(project: Project) {
    onChange({ projectId: project.id, name: project.name });
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className={classNames("mb-1.5 block text-[15px] font-semibold text-ink", hideLabel && "sr-only")} htmlFor={listId}>
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" />
        <Input
          aria-autocomplete="list"
          aria-controls={`${listId}-list`}
          aria-expanded={open}
          autoComplete="off"
          autoFocus={autoFocus}
          className="pl-11"
          id={listId}
          placeholder={placeholder}
          role="combobox"
          value={text}
          onBlur={() => {
            setOpen(false);
            // Wpisana nazwa istniejącej budowy – podepnij ją automatycznie.
            if (!linked && exact) onChange({ projectId: exact.id, name: exact.name });
          }}
          onChange={(event) => {
            onChange(event.target.value ? { projectId: null, name: event.target.value } : null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (suggestions.length > 0 || isNew) ? (
        <ul
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-auto rounded-xl border border-ink bg-card py-1 shadow-[0_12px_30px_rgba(31,40,48,0.18)]"
          id={`${listId}-list`}
          role="listbox"
        >
          {!text.trim() ? <li className="px-4 pb-1 pt-2 text-sm text-steel">Ostatnio</li> : null}
          {suggestions.map((project) => (
            <li key={project.id}>
              <button
                className="flex min-h-12 w-full flex-col justify-center px-4 py-1.5 text-left hover:bg-well"
                onClick={() => pick(project)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                aria-selected={project.id === value?.projectId}
                type="button"
              >
                <span className="text-[17px] font-semibold text-ink">{project.name}</span>
                {project.client || project.address ? (
                  <span className="text-sm text-steel">{[project.client, project.address].filter(Boolean).join(", ")}</span>
                ) : null}
              </button>
            </li>
          ))}
          {isNew ? (
            <li>
              <button
                className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-[17px] font-semibold text-ink hover:bg-well"
                onClick={() => setOpen(false)}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <Plus className="h-5 w-5 text-vis-dark" />
                Nowe miejsce: „{text.trim()}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {isNew ? <p className="mt-1 text-sm text-steel">Nowe miejsce – dopisze się do listy budów przy zapisie.</p> : null}
    </div>
  );
}

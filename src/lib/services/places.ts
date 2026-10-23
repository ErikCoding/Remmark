import { createProject } from "@/lib/services/projects";
import type { Place, Project } from "@/types/domain";

const RECENT_KEY = "remmark:recentPlaces";

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");

export function placeFromProject(project: Project): Place {
  return { projectId: project.id, name: project.name };
}

export function findProjectByName(projects: Project[], name: string): Project | undefined {
  const target = normalize(name);
  return target ? projects.find((project) => normalize(project.name) === target) : undefined;
}

/** Podpowiedzi miejsc: dopasowanie do wpisanego tekstu, a bez tekstu – ostatnio używane. */
export function suggestPlaces(projects: Project[], text: string, recentIds: string[], max = 6): Project[] {
  const query = normalize(text);
  const rank = (project: Project) => {
    const index = recentIds.indexOf(project.id);
    return index === -1 ? 999 : index;
  };
  if (!query) {
    return recentIds
      .map((id) => projects.find((project) => project.id === id))
      .filter((project): project is Project => Boolean(project) && project!.status !== "completed")
      .slice(0, max);
  }
  return projects
    .filter((project) => normalize(`${project.name} ${project.client} ${project.address}`).includes(query))
    .sort((a, b) => {
      const aStarts = normalize(a.name).startsWith(query) ? 0 : 1;
      const bStarts = normalize(b.name).startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (a.status !== b.status) return a.status === "completed" ? 1 : b.status === "completed" ? -1 : 0;
      return rank(a) - rank(b) || a.name.localeCompare(b.name, "pl");
    })
    .slice(0, max);
}

/**
 * Zamienia wpisane miejsca na id budów. Istniejąca nazwa → ta budowa,
 * nowa nazwa → nowa budowa (raz, nawet jeśli wpisana kilka razy).
 */
export async function resolvePlaces(places: Place[], projects: Project[]): Promise<string[]> {
  const created = new Map<string, string>();
  const ids: string[] = [];
  for (const place of places) {
    if (place.projectId && projects.some((project) => project.id === place.projectId)) {
      ids.push(place.projectId);
      continue;
    }
    const existing = findProjectByName(projects, place.name);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const key = normalize(place.name);
    let id = created.get(key);
    if (!id) {
      id = await createProject({ name: place.name.trim(), client: "", address: "", status: "active", projectNumber: "", notes: "" });
      created.set(key, id);
    }
    ids.push(id);
  }
  return ids;
}

export function getRecentPlaceIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    const legacy = window.localStorage.getItem("remmark:lastProjectId");
    const ids = Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
    return legacy && !ids.includes(legacy) ? [...ids, legacy] : ids;
  } catch {
    return [];
  }
}

export function rememberPlaces(projectIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentPlaceIds();
    const next = [...projectIds.slice().reverse(), ...current].filter((id, index, all) => all.indexOf(id) === index).slice(0, 10);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // brak localStorage – pomijamy
  }
}

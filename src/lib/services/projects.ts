import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Project, ProjectStatus } from "@/types/domain";

const projectsCollection = collection(db, "projects");

export type ProjectInput = {
  name: string;
  client: string;
  address: string;
  projectNumber?: string;
  status: ProjectStatus;
  notes?: string;
};

export function subscribeProjects(onChange: (projects: Project[]) => void, onError: (error: Error) => void) {
  const projectsQuery = query(projectsCollection, orderBy("status"), orderBy("name"));
  return onSnapshot(
    projectsQuery,
    (snapshot) => {
      const projects = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Project);
      onChange(sortProjects(projects));
    },
    (error) => onError(error),
  );
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snapshot = await getDoc(doc(db, "projects", projectId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Project;
}

export async function createProject(input: ProjectInput): Promise<string> {
  const created = await addDoc(projectsCollection, {
    ...input,
    projectNumber: input.projectNumber ?? "",
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

export async function updateProject(projectId: string, input: ProjectInput): Promise<void> {
  await updateDoc(doc(db, "projects", projectId), {
    ...input,
    projectNumber: input.projectNumber ?? "",
    notes: input.notes ?? "",
    updatedAt: serverTimestamp(),
  });
}

function sortProjects(projects: Project[]): Project[] {
  const statusWeight: Record<ProjectStatus, number> = {
    active: 0,
    paused: 1,
    completed: 2,
  };

  return [...projects].sort((a, b) => {
    const statusDifference = statusWeight[a.status] - statusWeight[b.status];
    if (statusDifference !== 0) return statusDifference;
    return a.name.localeCompare(b.name, "pl");
  });
}

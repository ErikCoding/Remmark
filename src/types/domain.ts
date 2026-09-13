import type { Timestamp } from "firebase/firestore";

export type ProjectStatus = "active" | "paused" | "completed";

export type UserRole = "admin" | "worker";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Timestamp;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
  projectNumber?: string;
  status: ProjectStatus;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkLog {
  id: string;
  projectId: string;
  userId: string;
  date: Timestamp;
  dateKey: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  descriptionPL: string;
  descriptionNL?: string;
  notes?: string;
  photos: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ActiveTimer {
  id: string;
  userId: string;
  projectId: string;
  startedAt: Timestamp;
  startTime: string;
  dateKey: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProjectStats {
  projectId: string;
  visits: number;
  totalMinutes: number;
  lastVisitDate?: Timestamp;
}

export interface DateRange {
  from: string;
  to: string;
}

export type ReportLanguage = "pl" | "nl";

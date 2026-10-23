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
  /** Przerwa w minutach. Starsze wpisy mogą jej nie mieć (= 0). */
  breakMinutes?: number;
  /** Czas pracy netto (bez przerwy) w minutach. */
  durationMinutes: number;
  descriptionPL: string;
  descriptionNL?: string;
  notes?: string;
  photos: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Miejsce pracy wybrane lub wpisane przez użytkownika. Nowa nazwa bez projectId tworzy budowę przy zapisie. */
export interface Place {
  projectId?: string | null;
  name: string;
}

/** Odcinek trwającego dnia pracy: od kiedy jest się w danym miejscu. */
export interface TimerSegment {
  place?: Place | null;
  startMs: number;
  breakMinutes: number;
}

export interface ActiveTimer {
  id: string;
  userId: string;
  startedAt: Timestamp;
  startTime: string;
  dateKey: string;
  segments?: TimerSegment[];
  /** Gdy trwa przerwa – kiedy się zaczęła (ms od epoki). */
  breakStartedAtMs?: number | null;
  /** Pola ze starszej wersji (jedna budowa na licznik). */
  projectId?: string;
  breakMinutes?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DateRange {
  from: string;
  to: string;
}

export type ReportLanguage = "pl" | "nl";

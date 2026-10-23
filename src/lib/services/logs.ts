import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { dateKeyToDate, minutesBetween, netMinutes, timeToMinutes } from "@/lib/utils/date";
import type { DateRange, WorkLog } from "@/types/domain";

const logsCollection = collection(db, "logs");

export type WorkLogInput = {
  projectId: string;
  userId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  descriptionPL: string;
  descriptionNL?: string;
  notes?: string;
  photos?: string[];
};

function mapLog(id: string, data: Record<string, unknown>): WorkLog {
  const log = { id, ...data } as WorkLog;
  return { ...log, breakMinutes: Number(log.breakMinutes ?? 0), photos: log.photos ?? [] };
}

export function logBreak(log: Pick<WorkLog, "breakMinutes">): number {
  return Number(log.breakMinutes ?? 0);
}

export function subscribeLogsByRange(
  userId: string,
  range: DateRange,
  onChange: (logs: WorkLog[]) => void,
  onError: (error: Error) => void,
) {
  const logsQuery = query(
    logsCollection,
    where("userId", "==", userId),
    where("dateKey", ">=", range.from),
    where("dateKey", "<=", range.to),
    orderBy("dateKey", "desc"),
    orderBy("startTime", "desc"),
    limit(2000),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => mapLog(item.id, item.data()))),
    (error) => onError(error),
  );
}

export function subscribeProjectLogs(
  userId: string,
  projectId: string,
  onChange: (logs: WorkLog[]) => void,
  onError: (error: Error) => void,
) {
  const logsQuery = query(
    logsCollection,
    where("userId", "==", userId),
    where("projectId", "==", projectId),
    orderBy("date", "desc"),
    limit(500),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => mapLog(item.id, item.data()))),
    (error) => onError(error),
  );
}

export async function getWorkLog(logId: string): Promise<WorkLog | null> {
  const snapshot = await getDoc(doc(db, "logs", logId));
  if (!snapshot.exists()) return null;
  return mapLog(snapshot.id, snapshot.data());
}

export async function createWorkLog(input: WorkLogInput): Promise<string> {
  validateWorkLog(input);
  const created = await addDoc(logsCollection, {
    ...normalizeWorkLog(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  rememberDefaults(input);
  return created.id;
}

export async function updateWorkLog(logId: string, input: WorkLogInput): Promise<void> {
  validateWorkLog(input);
  await updateDoc(doc(db, "logs", logId), {
    ...normalizeWorkLog(input),
    updatedAt: serverTimestamp(),
  });
  rememberDefaults(input);
}

export async function deleteWorkLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, "logs", logId));
}

export type LogDefaults = { projectId?: string; startTime: string; endTime: string; breakMinutes: number };

export function getSavedLogDefaults(): LogDefaults {
  const fallback: LogDefaults = { startTime: "07:00", endTime: "15:30", breakMinutes: 30 };
  if (typeof window === "undefined") return fallback;
  try {
    const storedBreak = window.localStorage.getItem("remmark:lastBreak");
    return {
      projectId: window.localStorage.getItem("remmark:lastProjectId") ?? undefined,
      startTime: window.localStorage.getItem("remmark:lastStartTime") ?? fallback.startTime,
      endTime: window.localStorage.getItem("remmark:lastEndTime") ?? fallback.endTime,
      breakMinutes: storedBreak !== null ? Number(storedBreak) || 0 : fallback.breakMinutes,
    };
  } catch {
    return fallback;
  }
}

function rememberDefaults(input: WorkLogInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("remmark:lastProjectId", input.projectId);
    window.localStorage.setItem("remmark:lastStartTime", input.startTime);
    window.localStorage.setItem("remmark:lastEndTime", input.endTime);
    window.localStorage.setItem("remmark:lastBreak", String(input.breakMinutes || 0));
  } catch {
    // localStorage niedostępny – pomijamy zapamiętywanie.
  }
}

function normalizeWorkLog(input: WorkLogInput) {
  const breakMinutes = Math.max(0, Math.round(input.breakMinutes || 0));
  return {
    projectId: input.projectId,
    userId: input.userId,
    date: Timestamp.fromDate(dateKeyToDate(input.dateKey)),
    dateKey: input.dateKey,
    startTime: input.startTime,
    endTime: input.endTime,
    breakMinutes,
    durationMinutes: netMinutes(input.startTime, input.endTime, breakMinutes),
    descriptionPL: input.descriptionPL.trim(),
    descriptionNL: input.descriptionNL?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    photos: input.photos ?? [],
  };
}

export function validateWorkLog(input: Pick<WorkLogInput, "projectId" | "dateKey" | "startTime" | "endTime" | "breakMinutes">): void {
  if (!input.projectId) throw new Error("Wybierz budowę.");
  if (!input.dateKey) throw new Error("Podaj datę.");
  const gross = minutesBetween(input.startTime, input.endTime);
  if (gross <= 0) throw new Error("Sprawdź godziny – start i koniec nie mogą być takie same.");
  if (gross > 20 * 60) throw new Error("Wpis jest dłuższy niż 20 godzin – sprawdź godziny.");
  if ((input.breakMinutes || 0) >= gross) throw new Error("Przerwa nie może być dłuższa niż cały czas pracy.");
}

/** Jednorazowo pobiera wszystkie wpisy z danego dnia (do edycji dnia). */
export async function fetchDayLogs(userId: string, dateKey: string): Promise<WorkLog[]> {
  const snapshot = await getDocs(
    query(logsCollection, where("userId", "==", userId), where("dateKey", "==", dateKey)),
  );
  return snapshot.docs.map((item) => mapLog(item.id, item.data())).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export type DaySegmentInput = {
  id?: string;
  projectId: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  descriptionPL: string;
  descriptionNL?: string;
  notes?: string;
  photos?: string[];
};

/** Sprawdza odcinki dnia: godziny, przerwy i czy się nie nakładają. Zwraca komunikat błędu albo null. */
export function checkDay(segments: Array<Omit<DaySegmentInput, "projectId"> & { projectId?: string; label?: string }>): string | null {
  for (const [index, segment] of segments.entries()) {
    const label = segment.label || `Miejsce ${index + 1}`;
    const gross = minutesBetween(segment.startTime, segment.endTime);
    if (!segment.startTime || !segment.endTime || gross <= 0) return `${label}: sprawdź godziny od–do.`;
    if (gross > 20 * 60) return `${label}: ponad 20 godzin – sprawdź godziny.`;
    if ((segment.breakMinutes || 0) >= gross) return `${label}: przerwa dłuższa niż czas pracy.`;
  }
  const intervals = segments
    .map((segment, index) => {
      const start = timeToMinutes(segment.startTime);
      const end = start + minutesBetween(segment.startTime, segment.endTime);
      return { start, end, label: segment.label || `Miejsce ${index + 1}` };
    })
    .sort((a, b) => a.start - b.start);
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].start < intervals[index - 1].end) {
      return `Godziny się nakładają: ${intervals[index - 1].label} i ${intervals[index].label}.`;
    }
  }
  return null;
}

/** Zapisuje cały dzień naraz: aktualizuje, dodaje i usuwa odcinki w jednej operacji. */
export async function saveDay(userId: string, dateKey: string, segments: DaySegmentInput[], removedIds: string[]): Promise<void> {
  const problem = checkDay(segments);
  if (problem) throw new Error(problem);
  segments.forEach((segment) => validateWorkLog({ ...segment, dateKey }));

  const batch = writeBatch(db);
  segments.forEach((segment) => {
    const data = normalizeWorkLog({ ...segment, userId, dateKey });
    if (segment.id) {
      batch.update(doc(db, "logs", segment.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      batch.set(doc(logsCollection), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  });
  removedIds.forEach((id) => batch.delete(doc(db, "logs", id)));
  await batch.commit();

  const last = [...segments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (last.length) {
    rememberDefaults({
      ...last[last.length - 1],
      startTime: last[0].startTime,
      userId,
      dateKey,
      breakMinutes: segments.reduce((sum, segment) => sum + (segment.breakMinutes || 0), 0),
    });
  }
}

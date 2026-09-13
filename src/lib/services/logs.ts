import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { dateKeyToDate, minutesBetween, todayKey } from "@/lib/utils/date";
import type { DateRange, WorkLog } from "@/types/domain";

const logsCollection = collection(db, "logs");

export type WorkLogInput = {
  projectId: string;
  userId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  descriptionPL: string;
  descriptionNL?: string;
  notes?: string;
  photos?: string[];
};

export function subscribeRecentLogs(
  userId: string,
  maxItems: number,
  onChange: (logs: WorkLog[]) => void,
  onError: (error: Error) => void,
) {
  const logsQuery = query(
    logsCollection,
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(maxItems),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WorkLog)),
    (error) => onError(error),
  );
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
    limit(250),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WorkLog)),
    (error) => onError(error),
  );
}

export function subscribeProjectLogs(
  projectId: string,
  onChange: (logs: WorkLog[]) => void,
  onError: (error: Error) => void,
) {
  const logsQuery = query(
    logsCollection,
    where("projectId", "==", projectId),
    orderBy("date", "desc"),
    limit(100),
  );

  return onSnapshot(
    logsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WorkLog)),
    (error) => onError(error),
  );
}

export async function getWorkLog(logId: string): Promise<WorkLog | null> {
  const snapshot = await getDoc(doc(db, "logs", logId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as WorkLog;
}

export async function createWorkLog(input: WorkLogInput): Promise<string> {
  validateWorkLog(input);
  const created = await addDoc(logsCollection, {
    ...normalizeWorkLog(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  rememberDefaults(input.projectId, input.startTime, input.endTime);
  return created.id;
}

export async function updateWorkLog(logId: string, input: WorkLogInput): Promise<void> {
  validateWorkLog(input);
  await updateDoc(doc(db, "logs", logId), {
    ...normalizeWorkLog(input),
    updatedAt: serverTimestamp(),
  });
  rememberDefaults(input.projectId, input.startTime, input.endTime);
}

export async function deleteWorkLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, "logs", logId));
}

export function getSavedLogDefaults(): { projectId?: string; startTime: string; endTime: string } {
  if (typeof window === "undefined") return { startTime: "07:00", endTime: "15:00" };
  return {
    projectId: window.localStorage.getItem("remmark:lastProjectId") ?? undefined,
    startTime: window.localStorage.getItem("remmark:lastStartTime") ?? "07:00",
    endTime: window.localStorage.getItem("remmark:lastEndTime") ?? "15:00",
  };
}

function rememberDefaults(projectId: string, startTime: string, endTime: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("remmark:lastProjectId", projectId);
  window.localStorage.setItem("remmark:lastStartTime", startTime);
  window.localStorage.setItem("remmark:lastEndTime", endTime);
}

function normalizeWorkLog(input: WorkLogInput) {
  const durationMinutes = minutesBetween(input.startTime, input.endTime);
  return {
    projectId: input.projectId,
    userId: input.userId,
    date: Timestamp.fromDate(dateKeyToDate(input.dateKey || todayKey())),
    dateKey: input.dateKey,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes,
    descriptionPL: input.descriptionPL.trim(),
    descriptionNL: input.descriptionNL?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    photos: input.photos ?? [],
  };
}

function validateWorkLog(input: WorkLogInput): void {
  if (!input.projectId) throw new Error("Wybierz budowę.");
  if (!input.dateKey) throw new Error("Podaj poprawną datę.");
  if (minutesBetween(input.startTime, input.endTime) <= 0) {
    throw new Error("Godzina zakończenia musi być późniejsza niż rozpoczęcia.");
  }
}

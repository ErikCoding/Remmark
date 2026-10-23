import { Timestamp, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { timeNow, todayKey } from "@/lib/utils/date";
import type { ActiveTimer, Place, TimerSegment } from "@/types/domain";

const pad = (value: number) => String(value).padStart(2, "0");
const msToTime = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function subscribeActiveTimer(
  userId: string,
  onChange: (timer: ActiveTimer | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, "activeTimers", userId),
    (snapshot) => onChange(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ActiveTimer) : null),
    (error) => onError(error),
  );
}

/** Odcinki licznika – obsługuje też liczniki ze starszej wersji (jedna budowa). */
export function timerSegments(timer: ActiveTimer): TimerSegment[] {
  if (timer.segments?.length) return timer.segments;
  const startMs = timer.startedAt?.toMillis ? timer.startedAt.toMillis() : Date.now();
  return [{ place: timer.projectId ? { projectId: timer.projectId, name: "" } : null, startMs, breakMinutes: timer.breakMinutes ?? 0 }];
}

function runningBreak(timer: ActiveTimer, now = Date.now()) {
  return timer.breakStartedAtMs ? Math.max(0, now - timer.breakStartedAtMs) / 60000 : 0;
}

function withClosedBreak(timer: ActiveTimer, now = Date.now()): TimerSegment[] {
  const segments = timerSegments(timer).map((segment) => ({ ...segment }));
  const extra = runningBreak(timer, now);
  if (extra > 0) segments[segments.length - 1].breakMinutes = Math.round(segments[segments.length - 1].breakMinutes + extra);
  return segments;
}

const ref = (userId: string) => doc(db, "activeTimers", userId);

export async function startTimer(userId: string, place?: Place | null): Promise<void> {
  const now = Date.now();
  await setDoc(ref(userId), {
    userId,
    startedAt: Timestamp.fromMillis(now),
    startTime: timeNow(),
    dateKey: todayKey(),
    segments: [{ place: place ?? null, startMs: now, breakMinutes: 0 }],
    breakStartedAtMs: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Ustawia, gdzie jest się teraz (bieżący odcinek). */
export async function setCurrentPlace(timer: ActiveTimer, place: Place): Promise<void> {
  const segments = timerSegments(timer).map((segment) => ({ ...segment }));
  segments[segments.length - 1].place = place;
  await updateDoc(ref(timer.userId), { segments, updatedAt: serverTimestamp() });
}

/** Kończy bieżące miejsce teraz i zaczyna kolejne. */
export async function switchPlace(timer: ActiveTimer, place: Place | null): Promise<void> {
  const now = Date.now();
  const segments = withClosedBreak(timer, now);
  segments.push({ place, startMs: now, breakMinutes: 0 });
  await updateDoc(ref(timer.userId), { segments, breakStartedAtMs: null, updatedAt: serverTimestamp() });
}

export async function startBreak(timer: ActiveTimer): Promise<void> {
  await updateDoc(ref(timer.userId), { segments: timerSegments(timer), breakStartedAtMs: Date.now(), updatedAt: serverTimestamp() });
}

export async function endBreak(timer: ActiveTimer): Promise<void> {
  await updateDoc(ref(timer.userId), { segments: withClosedBreak(timer), breakStartedAtMs: null, updatedAt: serverTimestamp() });
}

export async function cancelTimer(userId: string): Promise<void> {
  await deleteDoc(ref(userId));
}

export function totalBreakMinutes(timer: ActiveTimer, now = Date.now()): number {
  return Math.round(timerSegments(timer).reduce((sum, segment) => sum + segment.breakMinutes, 0) + runningBreak(timer, now));
}

export function elapsedWorkMinutes(timer: ActiveTimer, now = Date.now()): number {
  const startMs = timerSegments(timer)[0].startMs;
  return Math.max(0, Math.floor((now - startMs) / 60000 - totalBreakMinutes(timer, now)));
}

export type TimerDraftSegment = { place: Place | null; startTime: string; endTime: string; breakMinutes: number };

/** Zamienia licznik na odcinki dnia do sprawdzenia i zapisania (koniec ostatniego = teraz). */
export function timerDraft(timer: ActiveTimer, now = Date.now()): TimerDraftSegment[] {
  const segments = withClosedBreak(timer, now);
  const draft: TimerDraftSegment[] = [];
  segments.forEach((segment, index) => {
    const endMs = index < segments.length - 1 ? segments[index + 1].startMs : now;
    const startTime = msToTime(segment.startMs);
    const endTime = msToTime(endMs);
    if (startTime === endTime) {
      // Odcinek krótszy niż minuta – doklej przerwę do poprzedniego.
      if (draft.length) draft[draft.length - 1].breakMinutes += segment.breakMinutes;
      return;
    }
    draft.push({ place: segment.place ?? null, startTime, endTime, breakMinutes: segment.breakMinutes });
  });
  return draft;
}

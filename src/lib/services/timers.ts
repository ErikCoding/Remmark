import {
  Timestamp,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { todayKey, timeNow } from "@/lib/utils/date";
import type { ActiveTimer } from "@/types/domain";

export function subscribeActiveTimer(
  userId: string,
  onChange: (timer: ActiveTimer | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, "activeTimers", userId),
    (snapshot) => {
      onChange(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ActiveTimer) : null);
    },
    (error) => onError(error),
  );
}

export async function startTimer(userId: string, projectId: string): Promise<void> {
  const startTime = timeNow();
  await setDoc(doc(db, "activeTimers", userId), {
    userId,
    projectId,
    startedAt: Timestamp.now(),
    startTime,
    dateKey: todayKey(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function stopTimer(userId: string): Promise<void> {
  await deleteDoc(doc(db, "activeTimers", userId));
}

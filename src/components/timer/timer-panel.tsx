"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Car, Coffee, MapPinCheck, PenLine, Play, Square } from "lucide-react";
import { PlaceInput } from "@/components/places/place-input";
import { Button, buttonClass } from "@/components/ui/button";
import { useActiveTimer } from "@/hooks/use-active-timer";
import { useNow } from "@/hooks/use-now";
import { getRecentPlaceIds } from "@/lib/services/places";
import {
  cancelTimer,
  elapsedWorkMinutes,
  endBreak,
  isTravelSegment,
  setCurrentPlace,
  setTravelUnpaid,
  startBreak,
  startTimer,
  startTravel,
  switchPlace,
  timerSegments,
  totalBreakMinutes,
} from "@/lib/services/timers";
import { formatDuration, todayKey } from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";
import type { Place, Project, TimerSegment } from "@/types/domain";

const pad = (value: number) => String(value).padStart(2, "0");
const clock = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** switch – zmiana miejsca bez jazdy, setPlace – nazwa bieżącego miejsca, arrive – koniec jazdy. */
type Mode = "idle" | "switch" | "setPlace" | "arrive";

export function TimerPanel({ userId, projects }: { userId: string; projects: Project[] }) {
  const router = useRouter();
  const { timer, loading } = useActiveTimer(userId);
  const now = useNow(10000);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("idle");
  const [draftPlace, setDraftPlace] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRecentIds(getRecentPlaceIds()), []);

  async function run(action: () => Promise<void>, failMessage: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error && actionError.message ? actionError.message : failMessage);
    } finally {
      setBusy(false);
    }
  }

  function openPlace(next: Mode, place: Place | null = null) {
    setError(null);
    setDraftPlace(place);
    setMode(next);
  }

  const placeName = (place?: Place | null) =>
    place?.name || (place?.projectId ? projects.find((project) => project.id === place.projectId)?.name : "") || "";

  if (loading) return <div className="h-48 animate-pulse rounded-box bg-[#dde2e6]" />;

  if (!timer) {
    return (
      <section className="panel p-4">
        <h2 className="font-cond text-[28px] font-bold leading-tight text-ink">Zaczynasz pracę?</h2>
        <p className="mt-1 text-[15px] text-steel">Dotknij, gdy zaczynasz. Gdzie byłeś, wpiszesz w trakcie albo na koniec dnia.</p>
        {error ? <p className="mt-3 text-[15px] font-semibold text-stop">{error}</p> : null}
        <Button
          className="mt-4"
          disabled={busy}
          full
          size="lg"
          variant="vis"
          onClick={() => run(() => startTimer(userId), "Nie udało się wystartować. Sprawdź internet.")}
        >
          <Play className="h-6 w-6" fill="currentColor" />
          {busy ? "Startuję…" : "Zaczynam pracę"}
        </Button>
        <p className="mb-2 mt-5 flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Car className="h-5 w-5" />
          Zaczynam od jazdy
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-line bg-card px-2 py-2 text-center hover:border-steel disabled:opacity-50"
            disabled={busy}
            onClick={() => run(() => startTimer(userId, "travel"), "Nie udało się wystartować. Sprawdź internet.")}
            type="button"
          >
            <span className="text-lg font-semibold leading-tight text-ink">Płatna</span>
            <span className="text-sm text-steel">liczy się do godzin</span>
          </button>
          <button
            className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-line bg-card px-2 py-2 text-center hover:border-steel disabled:opacity-50"
            disabled={busy}
            onClick={() => run(() => startTimer(userId, "travel", true), "Nie udało się wystartować. Sprawdź internet.")}
            type="button"
          >
            <span className="text-lg font-semibold leading-tight text-ink">Bezpłatna</span>
            <span className="text-sm text-steel">nie liczy się</span>
          </button>
        </div>
        <Link className={classNames(buttonClass("ghost", "md", true), "mt-2")} href="/dzien">
          <PenLine className="h-5 w-5" />
          Wpisz dzień ręcznie
        </Link>
      </section>
    );
  }

  const segments = timerSegments(timer);
  const current = segments[segments.length - 1];
  const earlier = segments.slice(0, -1);
  const traveling = isTravelSegment(current);
  const unpaidTravel = traveling && Boolean(current.unpaid);
  const onBreak = Boolean(timer.breakStartedAtMs);
  const worked = elapsedWorkMinutes(timer, now);
  const breaks = totalBreakMinutes(timer, now);
  const breakNow = onBreak && timer.breakStartedAtMs ? Math.round((now - timer.breakStartedAtMs) / 60000) : 0;
  const travelNow = traveling ? Math.max(0, Math.floor((now - current.startMs) / 60000)) : 0;
  const currentName = placeName(current.place);
  const fromYesterday = timer.dateKey !== todayKey();

  const segmentLabel = (segment: TimerSegment) =>
    isTravelSegment(segment) ? (
      <span className="flex items-center gap-1.5">
        <Car className="h-4 w-4" />
        {segment.unpaid ? "Jazda bezpłatna" : "Jazda"}
      </span>
    ) : (
      placeName(segment.place) || "bez miejsca"
    );

  const placeForm = {
    switch: { label: "Dokąd teraz?", hint: "Poprzednie miejsce zakończy się teraz. Nazwę możesz też wpisać później.", button: "Jestem tu od teraz", required: false },
    setPlace: { label: "Gdzie jesteś teraz?", hint: "", button: "Zapisz", required: true },
    arrive: { label: "Gdzie dojechałeś?", hint: "Jazda kończy się teraz, a od teraz liczy się czas na tym miejscu.", button: "Zaczynam tutaj", required: true },
    idle: { label: "", hint: "", button: "", required: false },
  }[mode];

  return (
    <section className="overflow-hidden rounded-box bg-ink text-white" aria-live="polite">
      <div className="p-4 pb-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          {traveling && !onBreak ? (
            <Car className="h-5 w-5 text-vis" />
          ) : (
            <span className={classNames("h-2.5 w-2.5 rounded-full", onBreak ? "bg-white/60" : "animate-pulse bg-vis")} />
          )}
          {onBreak ? "Przerwa" : traveling ? `${unpaidTravel ? "Jazda bezpłatna" : "Jazda"} – ${formatDuration(travelNow)}` : "Praca trwa"}
        </div>
        <p className="mt-2 font-cond text-[76px] font-bold leading-[0.9] tracking-tight">
          {Math.floor(worked / 60)}:{pad(worked % 60)}
          <span className="ml-2 text-2xl font-semibold text-white/60">h</span>
        </p>
        <p className="mt-2 text-[15px] text-white/70">
          Od {clock(segments[0].startMs)}
          {fromYesterday ? " (wczoraj)" : ""}
          {breaks > 0 ? ` · przerwa ${formatDuration(breaks)}` : ""}
          {traveling && !unpaidTravel ? " · jazda liczy się do pracy" : ""}
          {unpaidTravel ? " · ta jazda się nie liczy – zegar stoi" : ""}
        </p>
        {traveling ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 p-1" role="group" aria-label="Czy ta jazda liczy się do godzin">
            {[
              { unpaid: false, label: "Liczy się" },
              { unpaid: true, label: "Nie liczy się" },
            ].map((option) => (
              <button
                aria-pressed={unpaidTravel === option.unpaid}
                className={classNames(
                  "min-h-11 flex-1 rounded-md text-[15px] font-semibold transition-colors disabled:opacity-50",
                  unpaidTravel === option.unpaid ? "bg-white text-ink" : "text-white/70 hover:text-white",
                )}
                disabled={busy}
                key={option.label}
                onClick={() => unpaidTravel !== option.unpaid && run(() => setTravelUnpaid(timer, option.unpaid), "Nie udało się zmienić jazdy.")}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {onBreak ? <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[15px]">Przerwa trwa {breakNow} min – czas pracy stoi.</p> : null}

        <ol className="mt-4 space-y-1.5 border-t border-white/15 pt-3">
          {earlier.map((segment, index) => (
            <li className="flex gap-3 text-[15px] text-white/70" key={segment.startMs}>
              <span className="w-[104px] shrink-0 tabular-nums">
                {clock(segment.startMs)}–{clock(segments[index + 1].startMs)}
              </span>
              <span className="min-w-0 truncate">{segmentLabel(segment)}</span>
            </li>
          ))}
          <li className="flex items-baseline gap-3">
            <span className="w-[104px] shrink-0 text-[15px] tabular-nums text-white/70">od {clock(current.startMs)}</span>
            {traveling ? (
              <span className="text-lg font-semibold">{segmentLabel(current)}</span>
            ) : currentName ? (
              <button
                className="min-w-0 truncate text-left text-lg font-semibold underline decoration-white/30 underline-offset-4"
                onClick={() => openPlace("setPlace", current.place ?? null)}
                type="button"
              >
                {currentName}
              </button>
            ) : (
              <button className="text-lg font-semibold text-vis" onClick={() => openPlace("setPlace")} type="button">
                + Gdzie jesteś?
              </button>
            )}
          </li>
        </ol>
      </div>

      {mode !== "idle" ? (
        <div className="bg-concrete p-4 text-ink">
          <PlaceInput autoFocus label={placeForm.label} projects={projects} recentIds={recentIds} value={draftPlace} onChange={setDraftPlace} />
          {placeForm.hint ? <p className="mt-2 text-sm text-steel">{placeForm.hint}</p> : null}
          {error ? <p className="mt-3 text-[15px] font-semibold text-stop">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1"
              disabled={busy || (placeForm.required && !draftPlace?.name?.trim())}
              size="lg"
              variant={mode === "arrive" ? "vis" : "primary"}
              onClick={() =>
                run(async () => {
                  const place = draftPlace?.name?.trim() ? draftPlace : null;
                  if (mode === "switch" || mode === "arrive") await switchPlace(timer, place);
                  else if (place) await setCurrentPlace(timer, place);
                  setMode("idle");
                  setDraftPlace(null);
                }, "Nie udało się zapisać miejsca.")
              }
            >
              {placeForm.button}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setMode("idle")}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 bg-white/[0.06] p-4">
          {error ? <p className="text-[15px] font-semibold text-[#ffb4a8]">{error}</p> : null}
          {traveling ? (
            <button
              className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl bg-vis text-lg font-semibold hover:bg-vis-dark disabled:opacity-50"
              disabled={busy}
              onClick={() => openPlace("arrive")}
              type="button"
            >
              <MapPinCheck className="h-6 w-6" />
              Dojechałem – podaj miejsce
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/25 text-lg font-semibold hover:bg-white/10 disabled:opacity-50"
                disabled={busy}
                onClick={() => run(() => startTravel(timer), "Nie udało się zacząć jazdy.")}
                type="button"
              >
                <Car className="h-5 w-5" />
                Jazda
              </button>
              <button
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/25 text-lg font-semibold hover:bg-white/10 disabled:opacity-50"
                disabled={busy}
                onClick={() => openPlace("switch")}
                type="button"
              >
                <ArrowRightLeft className="h-5 w-5" />
                Inne miejsce
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-white/25 text-lg font-semibold hover:bg-white/10 disabled:opacity-50"
              disabled={busy}
              onClick={() => run(() => (onBreak ? endBreak(timer) : startBreak(timer)), "Nie udało się zapisać przerwy.")}
              type="button"
            >
              {onBreak ? <Play className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
              {onBreak ? "Wracam" : "Przerwa"}
            </button>
            <button
              className={classNames(
                "flex min-h-16 items-center justify-center gap-2 rounded-xl text-lg font-semibold disabled:opacity-50",
                traveling ? "border border-white/25 hover:bg-white/10" : "bg-vis hover:bg-vis-dark",
              )}
              disabled={busy}
              onClick={() => router.push("/dzien?licznik=1")}
              type="button"
            >
              <Square className="h-5 w-5" fill="currentColor" />
              {traveling ? "Kończę dzień" : "Kończę"}
            </button>
          </div>
          <div className="flex justify-end pt-1 text-[15px]">
            <button
              className="min-h-10 font-semibold text-white/60 hover:text-white"
              onClick={() => {
                if (window.confirm("Wyłączyć licznik bez zapisywania godzin?")) void run(() => cancelTimer(userId), "Nie udało się wyłączyć licznika.");
              }}
              type="button"
            >
              Anuluj bez zapisu
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

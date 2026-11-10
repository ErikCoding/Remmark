"use client";

import { useState } from "react";
import { Car, ChevronDown, Languages, Mic, MicOff, X } from "lucide-react";
import { PlaceInput } from "@/components/places/place-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { formatDuration, minutesBetween, netMinutes, timeToMinutes } from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";
import type { Place, Project, SegmentKind } from "@/types/domain";

export type SegmentState = {
  key: string;
  id?: string;
  kind: SegmentKind;
  /** Tylko jazda: nie liczy się do godzin. */
  unpaid?: boolean;
  place: Place | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  descriptionPL: string;
  descriptionNL: string;
  notes: string;
  photos: string[];
  fromTimer?: boolean;
  autoFocus?: boolean;
};

export function SegmentCard({
  index,
  segment,
  projects,
  recentIds,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  segment: SegmentState;
  projects: Project[];
  recentIds: string[];
  removable: boolean;
  onChange: (patch: Partial<SegmentState>) => void;
  onRemove: () => void;
}) {
  const [showMore, setShowMore] = useState(Boolean(segment.notes || segment.descriptionNL));
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const speech = useSpeechRecognition((text) => onChange({ descriptionPL: [segment.descriptionPL.trim(), text].filter(Boolean).join(" ") }));
  const gross = minutesBetween(segment.startTime, segment.endTime);
  const overnight = gross > 0 && timeToMinutes(segment.endTime) < timeToMinutes(segment.startTime);
  const net = netMinutes(segment.startTime, segment.endTime, segment.breakMinutes);
  const travel = segment.kind === "travel";

  async function translate() {
    if (!segment.descriptionPL.trim()) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: segment.descriptionPL, target: "nl" }),
      });
      const payload = (await response.json()) as { translatedText?: string; error?: string };
      if (!response.ok || !payload.translatedText) throw new Error(payload.error || "Tłumaczenie nie zadziałało.");
      onChange({ descriptionNL: payload.translatedText });
    } catch (error) {
      setTranslateError(error instanceof Error ? error.message : "Tłumaczenie nie zadziałało.");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className={classNames("panel p-4", travel && "border-dashed border-steel/60 bg-well")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-steel">
          {travel ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vis text-white">
              <Car className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-cond text-base text-white">{index + 1}</span>
          )}
          {travel ? <span className="text-[17px] text-ink">Jazda</span> : "Miejsce"}
          {segment.fromTimer ? <span className="font-normal">· z licznika</span> : null}
        </p>
        {removable ? (
          <button
            aria-label={travel ? "Usuń jazdę" : `Usuń miejsce ${index + 1}`}
            className="-mr-2 flex h-10 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-steel hover:bg-well hover:text-stop"
            onClick={onRemove}
            type="button"
          >
            <X className="h-5 w-5" />
            Usuń
          </button>
        ) : null}
      </div>

      {travel ? (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Czy ta jazda liczy się do godzin">
          <button
            aria-pressed={!segment.unpaid}
            className={classNames("chip min-h-11 px-2 text-[15px]", !segment.unpaid && "chip-on")}
            onClick={() => onChange({ unpaid: false })}
            type="button"
          >
            Liczy się
          </button>
          <button
            aria-pressed={Boolean(segment.unpaid)}
            className={classNames("chip min-h-11 px-2 text-[15px]", segment.unpaid && "chip-on")}
            onClick={() => onChange({ unpaid: true })}
            type="button"
          >
            Nie liczy się
          </button>
        </div>
      ) : (
        <PlaceInput
          autoFocus={segment.autoFocus}
          projects={projects}
          recentIds={recentIds}
          value={segment.place}
          onChange={(place) => onChange({ place })}
        />
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Od">
          <Input className="font-cond text-2xl font-semibold" type="time" value={segment.startTime} onChange={(event) => onChange({ startTime: event.target.value })} />
        </Field>
        <Field label="Do">
          <Input className="font-cond text-2xl font-semibold" type="time" value={segment.endTime} onChange={(event) => onChange({ endTime: event.target.value })} />
        </Field>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[15px] text-steel">
        <span className={classNames("font-cond text-xl font-bold", gross <= 0 ? "text-stop" : segment.unpaid ? "text-steel line-through decoration-2" : "text-ink")}>
          {gross > 0 ? formatDuration(segment.unpaid ? gross : net) : "Sprawdź godziny"}
        </span>
        {segment.unpaid && gross > 0 ? <span>nie liczy się do godzin</span> : null}
        {!segment.unpaid && segment.breakMinutes > 0 && gross > 0 ? <span>po odjęciu {segment.breakMinutes} min przerwy</span> : null}
        {overnight ? <span className="text-vis-dark">przez północ</span> : null}
      </p>

      <div className="mt-3">
        <Textarea
          aria-label={travel ? "Opis jazdy" : `Co było robione – miejsce ${index + 1}`}
          className="min-h-[52px]"
          placeholder={travel ? "Skąd – dokąd? (można pominąć)" : "Co było robione? (można pominąć)"}
          rows={1}
          value={segment.descriptionPL}
          onChange={(event) => onChange({ descriptionPL: event.target.value })}
        />
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          {speech.supported ? (
            <button
              className={classNames("flex min-h-11 items-center gap-1.5 text-[15px] font-semibold", speech.listening ? "text-vis-dark" : "text-steel hover:text-ink")}
              onClick={speech.listening ? speech.stop : speech.start}
              type="button"
            >
              {speech.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {speech.listening ? "Słucham… dotknij, aby skończyć" : "Podyktuj"}
            </button>
          ) : null}
          <button
            aria-expanded={showMore}
            className="flex min-h-11 items-center gap-1 text-[15px] font-semibold text-steel hover:text-ink"
            onClick={() => setShowMore((value) => !value)}
            type="button"
          >
            <ChevronDown className={classNames("h-5 w-5 transition-transform", showMore && "rotate-180")} />
            Notatka, opis NL
          </button>
        </div>
        {showMore ? (
          <div className="mt-2 space-y-3">
            <Field label="Notatka (tylko dla siebie)">
              <Textarea className="min-h-[52px]" value={segment.notes} onChange={(event) => onChange({ notes: event.target.value })} />
            </Field>
            <Field label="Opis po niderlandzku (do raportu NL)">
              <Textarea className="min-h-[52px]" value={segment.descriptionNL} onChange={(event) => onChange({ descriptionNL: event.target.value })} />
            </Field>
            <Button disabled={translating || !segment.descriptionPL.trim()} variant="secondary" onClick={translate}>
              <Languages className="h-5 w-5" />
              {translating ? "Tłumaczę…" : "Przetłumacz opis na NL"}
            </Button>
            {translateError ? <p className="text-sm font-semibold text-stop">{translateError}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { SegmentCard, type SegmentState } from "@/components/day/segment-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { checkDay, fetchDayLogs, getSavedLogDefaults, logBreak, saveDay } from "@/lib/services/logs";
import { getRecentPlaceIds, rememberPlaces, resolvePlaces } from "@/lib/services/places";
import { cancelTimer, timerDraft } from "@/lib/services/timers";
import { addDays, dateKeyToDate, formatDuration, formatLongDate, minutesBetween, netMinutes, timeToMinutes, todayKey } from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";
import type { ActiveTimer, Project } from "@/types/domain";

const BREAKS = [0, 15, 30, 45, 60];
let keySeed = 0;
const newKey = () => `s${Date.now()}-${keySeed++}`;

const plusMinutes = (time: string, minutes: number) => {
  const total = Math.min(timeToMinutes(time) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const fullDay = (key: string) => {
  const label = formatLongDate(dateKeyToDate(key));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function DayEditor({
  projects,
  initialDateKey,
  initialProjectId,
  timer,
}: {
  projects: Project[];
  initialDateKey?: string;
  initialProjectId?: string;
  /** Gdy podany – dzień jest kończony z licznika: jego odcinki dochodzą do dnia. */
  timer?: ActiveTimer | null;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const defaults = useMemo(() => getSavedLogDefaults(), []);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const today = todayKey();
  const yesterday = addDays(today, -1);

  const [dateKey, setDateKey] = useState(timer?.dateKey ?? initialDateKey ?? today);
  const [pickDate, setPickDate] = useState(Boolean(initialDateKey && initialDateKey !== today && initialDateKey !== yesterday));
  const [segments, setSegments] = useState<SegmentState[]>([]);
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [breakOverride, setBreakOverride] = useState<number | null>(null);
  const [customBreak, setCustomBreak] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const requestId = useRef(0);

  useEffect(() => setRecentIds(getRecentPlaceIds()), []);

  const loadDay = useCallback(
    async (key: string) => {
      if (!user) return;
      const request = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const logs = await fetchDayLogs(user.uid, key);
        if (request !== requestId.current) return;
        const loaded: SegmentState[] = logs.map((log) => ({
          key: newKey(),
          id: log.id,
          place: { projectId: log.projectId, name: projects.find((project) => project.id === log.projectId)?.name ?? "" },
          startTime: log.startTime,
          endTime: log.endTime,
          breakMinutes: logBreak(log),
          descriptionPL: log.descriptionPL ?? "",
          descriptionNL: log.descriptionNL ?? "",
          notes: log.notes ?? "",
          photos: log.photos ?? [],
        }));

        let next = loaded;
        if (timer && key === timer.dateKey) {
          const fromTimer = timerDraft(timer).map<SegmentState>((segment) => ({
            key: newKey(),
            place: segment.place?.projectId
              ? { projectId: segment.place.projectId, name: projects.find((p) => p.id === segment.place?.projectId)?.name ?? segment.place.name }
              : segment.place,
            startTime: segment.startTime,
            endTime: segment.endTime,
            breakMinutes: segment.breakMinutes,
            descriptionPL: "",
            descriptionNL: "",
            notes: "",
            photos: [],
            fromTimer: true,
          }));
          next = [...loaded, ...fromTimer];
        }

        if (next.length === 0) {
          const initialProject = initialProjectId ? projects.find((project) => project.id === initialProjectId) : undefined;
          next = [
            {
              key: newKey(),
              place: initialProject ? { projectId: initialProject.id, name: initialProject.name } : null,
              startTime: defaults.startTime,
              endTime: defaults.endTime,
              breakMinutes: 0,
              descriptionPL: "",
              descriptionNL: "",
              notes: "",
              photos: [],
            },
          ];
          setBreakOverride(defaults.breakMinutes);
          setCustomBreak(!BREAKS.includes(defaults.breakMinutes));
        } else {
          setBreakOverride(null);
          const total = next.reduce((sum, segment) => sum + segment.breakMinutes, 0);
          setCustomBreak(!BREAKS.includes(total));
        }

        setSegments([...next].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        setExistingIds(logs.map((log) => log.id));
        dirty.current = Boolean(timer);
      } catch {
        setError("Nie udało się wczytać dnia. Sprawdź internet.");
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, projects.length, timer?.id],
  );

  useEffect(() => {
    void loadDay(dateKey);
  }, [dateKey, loadDay]);

  function changeDate(key: string) {
    if (key === dateKey) return;
    if (dirty.current && !window.confirm("Masz niezapisane zmiany. Przejść do innego dnia bez zapisywania?")) return;
    dirty.current = false;
    setDateKey(key);
  }

  function update(key: string, patch: Partial<SegmentState>) {
    dirty.current = true;
    setSegments((current) => current.map((segment) => (segment.key === key ? { ...segment, ...patch } : segment)));
  }

  function addSegment() {
    dirty.current = true;
    setSegments((current) => {
      const last = current[current.length - 1];
      const start = last?.endTime || defaults.startTime;
      return [
        ...current,
        {
          key: newKey(),
          place: null,
          startTime: start,
          endTime: plusMinutes(start, 120),
          breakMinutes: 0,
          descriptionPL: "",
          descriptionNL: "",
          notes: "",
          photos: [],
          autoFocus: true,
        },
      ];
    });
  }

  function removeSegment(key: string) {
    dirty.current = true;
    setSegments((current) => current.filter((segment) => segment.key !== key));
  }

  // Przerwa: albo wybrana dla całego dnia (odejmowana od najdłuższego miejsca), albo zapisana przy miejscach.
  const longestKey = segments.reduce<SegmentState | undefined>(
    (best, segment) => (!best || minutesBetween(segment.startTime, segment.endTime) > minutesBetween(best.startTime, best.endTime) ? segment : best),
    undefined,
  )?.key;
  const effective = segments.map((segment) => ({
    ...segment,
    breakMinutes: breakOverride === null ? segment.breakMinutes : segment.key === longestKey ? breakOverride : 0,
  }));
  const totalBreak = effective.reduce((sum, segment) => sum + segment.breakMinutes, 0);
  const totalNet = effective.reduce((sum, segment) => sum + netMinutes(segment.startTime, segment.endTime, segment.breakMinutes), 0);
  const labelled = effective.map((segment, index) => ({ ...segment, label: segment.place?.name?.trim() || `Miejsce ${index + 1}` }));
  const problem = segments.length ? checkDay(labelled) : null;

  async function handleSave() {
    if (!user) return;
    setError(null);
    if (segments.length === 0 && existingIds.length === 0) {
      setError("Dodaj przynajmniej jedno miejsce.");
      return;
    }
    const missing = segments.findIndex((segment) => !segment.place?.name?.trim() && !segment.place?.projectId);
    if (missing !== -1) {
      setError(`Miejsce ${missing + 1}: wpisz, gdzie byłeś.`);
      return;
    }
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      const projectIds = await resolvePlaces(
        effective.map((segment) => segment.place!),
        projects,
      );
      const payload = effective.map((segment, index) => ({
        id: segment.id,
        projectId: projectIds[index],
        startTime: segment.startTime,
        endTime: segment.endTime,
        breakMinutes: segment.breakMinutes,
        descriptionPL: segment.descriptionPL,
        descriptionNL: segment.descriptionNL,
        notes: segment.notes,
        photos: segment.photos,
      }));
      const keptIds = new Set(segments.map((segment) => segment.id).filter(Boolean));
      await saveDay(
        user.uid,
        dateKey,
        payload,
        existingIds.filter((id) => !keptIds.has(id)),
      );
      rememberPlaces(projectIds);
      if (timer) await cancelTimer(user.uid);
      dirty.current = false;
      router.push(existingIds.length && !timer ? "/history?saved=1" : "/dashboard?saved=1");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać. Sprawdź internet.");
      setSaving(false);
    }
  }

  async function handleDeleteDay() {
    if (!user || !window.confirm(`Usunąć wszystkie wpisy z dnia ${fullDay(dateKey).toLowerCase()}? Tego nie da się cofnąć.`)) return;
    setSaving(true);
    try {
      await saveDay(user.uid, dateKey, [], existingIds);
      router.push("/history?saved=1");
    } catch {
      setError("Nie udało się usunąć. Sprawdź internet.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      {!timer ? (
        <section>
          <h2 className="section-title mb-2.5">Dzień</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={classNames("chip", !pickDate && dateKey === today && "chip-on")}
              onClick={() => {
                setPickDate(false);
                changeDate(today);
              }}
              type="button"
            >
              Dziś
            </button>
            <button
              className={classNames("chip", !pickDate && dateKey === yesterday && "chip-on")}
              onClick={() => {
                setPickDate(false);
                changeDate(yesterday);
              }}
              type="button"
            >
              Wczoraj
            </button>
            <button className={classNames("chip", pickDate && "chip-on")} onClick={() => setPickDate(true)} type="button">
              Inny dzień
            </button>
          </div>
          {pickDate ? (
            <Input aria-label="Data" className="mt-2" max={today} type="date" value={dateKey} onChange={(event) => event.target.value && changeDate(event.target.value)} />
          ) : null}
          <p className="mt-2 text-[15px] text-steel">{fullDay(dateKey)}</p>
        </section>
      ) : (
        <p className="text-[17px] text-steel">
          {fullDay(dateKey)} – sprawdź miejsca i godziny, uzupełnij brakujące i zapisz.
        </p>
      )}

      {loading ? (
        <SkeletonList rows={2} />
      ) : (
        <>
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="section-title">Gdzie i w jakich godzinach</h2>
              {existingIds.length && !timer ? <span className="text-sm text-steel">zapisany dzień</span> : null}
            </div>
            <div className="space-y-3">
              {effective.map((segment, index) => {
                const previous = effective[index - 1];
                const gap =
                  previous && previous.endTime && segment.startTime && minutesBetween(previous.startTime, previous.endTime) > 0
                    ? timeToMinutes(segment.startTime) - timeToMinutes(previous.endTime)
                    : 0;
                return (
                  <div key={segment.key}>
                    {gap > 0 ? (
                      <p className="mb-3 border-l-2 border-dashed border-line pl-3 text-sm text-steel">
                        {formatDuration(gap)} między miejscami – nie liczy się do czasu pracy
                      </p>
                    ) : null}
                    <SegmentCard
                      index={index}
                      projects={projects}
                      recentIds={recentIds}
                      removable={segments.length > 1 || existingIds.length > 0}
                      segment={segment}
                      onChange={(patch) => update(segment.key, patch)}
                      onRemove={() => removeSegment(segment.key)}
                    />
                  </div>
                );
              })}
            </div>
            <Button className="mt-3" full size="lg" variant="secondary" onClick={addSegment}>
              <Plus className="h-6 w-6" />
              Dodaj kolejne miejsce
            </Button>
          </section>

          <section>
            <h2 className="section-title">Przerwa w ciągu dnia</h2>
            <p className="mb-2.5 text-[15px] text-steel">
              {breakOverride === null && totalBreak > 0 ? `Zapisane przerwy: ${formatDuration(totalBreak)}.` : "Łącznie za cały dzień."}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {BREAKS.map((value) => (
                <button
                  className={classNames("chip px-2", !customBreak && totalBreak === value && "chip-on")}
                  key={value}
                  onClick={() => {
                    dirty.current = true;
                    setBreakOverride(value);
                    setCustomBreak(false);
                  }}
                  type="button"
                >
                  {value === 0 ? "Bez" : value === 60 ? "1 h" : `${value} min`}
                </button>
              ))}
              <button
                className={classNames("chip px-2", customBreak && "chip-on")}
                onClick={() => {
                  setCustomBreak(true);
                  setBreakOverride(totalBreak);
                }}
                type="button"
              >
                Inna
              </button>
            </div>
            {customBreak ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  aria-label="Przerwa w minutach"
                  className="w-28"
                  inputMode="numeric"
                  min={0}
                  type="number"
                  value={breakOverride ?? totalBreak}
                  onChange={(event) => {
                    dirty.current = true;
                    setBreakOverride(Math.max(0, Number(event.target.value) || 0));
                  }}
                />
                <span className="text-steel">minut</span>
              </div>
            ) : null}
          </section>

          {existingIds.length > 0 && !timer ? (
            <Button disabled={saving} full variant="danger" onClick={handleDeleteDay}>
              <Trash2 className="h-5 w-5" />
              Usuń cały dzień
            </Button>
          ) : null}

          <div className="sticky bottom-[calc(72px+var(--safe-bottom))] z-20 md:bottom-4">
            <div className="panel flex items-center gap-3 border-ink p-3 shadow-[0_10px_30px_rgba(31,40,48,0.18)]">
              <div className="min-w-0 flex-1 pl-1">
                <p className="text-sm text-steel">
                  Razem{segments.length > 1 ? `, ${segments.length} miejsca` : ""}
                  {totalBreak ? `, bez ${totalBreak} min przerwy` : ""}
                </p>
                <p className={classNames("font-cond text-[28px] font-bold leading-none", problem ? "text-stop" : "text-ink")}>
                  {problem && segments.length ? "Sprawdź godziny" : formatDuration(totalNet)}
                </p>
              </div>
              <Button disabled={saving} size="lg" variant="vis" onClick={handleSave}>
                {saving ? "Zapisuję…" : "Zapisz dzień"}
              </Button>
            </div>
            {error || (problem && segments.length > 1) ? (
              <p className="mt-2 rounded-xl bg-stop-soft px-3 py-2 text-[15px] font-semibold text-stop" role="alert">
                {error || problem}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

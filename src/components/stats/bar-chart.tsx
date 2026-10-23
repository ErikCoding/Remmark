import { formatHoursDecimal } from "@/lib/utils/date";
import { classNames } from "@/lib/utils/text";

export type Bar = { key: string; label: string; minutes: number; muted?: boolean; highlight?: boolean; title?: string };

/** Prosty wykres słupkowy godzin. Wartość nad słupkiem, podpis pod spodem. */
export function BarChart({ bars, height = 140, showValues = true }: { bars: Bar[]; height?: number; showValues?: boolean }) {
  const max = Math.max(60, ...bars.map((bar) => bar.minutes));
  const dense = bars.length > 14;
  return (
    <div className="flex items-end gap-[3px]" role="img" aria-label="Wykres godzin">
      {bars.map((bar) => {
        const pct = (bar.minutes / max) * 100;
        return (
          <div className="flex min-w-0 flex-1 flex-col items-center" key={bar.key} title={bar.title}>
            <div className="relative flex w-full items-end justify-center" style={{ height }}>
              {showValues && !dense && bar.minutes > 0 ? (
                <span className="absolute font-cond text-[13px] font-semibold text-ink" style={{ bottom: `calc(${pct}% + 2px)` }}>
                  {formatHoursDecimal(bar.minutes)}
                </span>
              ) : null}
              <div
                className={classNames(
                  "w-full max-w-[44px] rounded-t-[4px]",
                  bar.highlight ? "bg-vis" : bar.minutes > 0 ? "bg-ink" : "bg-transparent",
                  bar.muted && bar.minutes > 0 && "bg-[#9aa4ad]",
                )}
                style={{ height: bar.minutes > 0 ? `max(${pct}%, 3px)` : 0 }}
              />
            </div>
            <div className="mt-1 h-[3px] w-full bg-line" />
            <span className={classNames("mt-1 truncate text-center text-[12px] font-semibold text-steel", bar.highlight && "text-ink")}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

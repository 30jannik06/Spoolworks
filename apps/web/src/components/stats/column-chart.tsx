import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

import { niceMax } from "./format";

export type ColumnSeries = {
  name: string;
  /** Tailwind background class, e.g. "bg-primary" (the point) or "bg-chart-5" (context). */
  className: string;
};

export type ColumnDatum = {
  key: string;
  /** Short axis label ("Nov"). */
  label: string;
  /** Full label for tooltip and table ("Nov 2026"). */
  longLabel: string;
  values: number[];
};

/**
 * Columns over time, one or two series side by side, built from plain HTML so
 * it scales with its tile and needs no client JavaScript. Marks follow the
 * chart rules: at most 24 px wide, 4 px rounded top, square on the baseline,
 * 2 px gap between neighbours, hairline grid. Hover and keyboard focus show a
 * tooltip with every series; a table view below carries every value too.
 * With one series, the largest value and the latest one get a label on their
 * cap; with two, the legend, tooltip and table carry the values.
 */
export function ColumnChart({
  data,
  series,
  format,
  formatTick,
  title,
  height = 176,
}: {
  data: ColumnDatum[];
  series: ColumnSeries[];
  format: (value: number) => string;
  formatTick?: (value: number) => string;
  title: string;
  height?: number;
}) {
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const ticks = [max, max / 2, 0];
  const dense = data.length > 8;
  const peak = data.reduce(
    (best, d, i) => (d.values[0]! > (data[best]?.values[0] ?? -1) ? i : best),
    0,
  );
  const tick = formatTick ?? format;

  return (
    <figure className="space-y-3">
      {series.length > 1 && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2.5 rounded-[2px]", s.className)} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="flex gap-2">
        {/* y-axis ticks */}
        <div className="figure flex shrink-0 flex-col justify-between text-right text-[10px] leading-none text-muted-foreground" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {tick(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {/* hairline grid */}
            {ticks.map((t) => (
              <div
                key={t}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border"
                style={{ top: `${(1 - t / max) * 100}%` }}
              />
            ))}
            <ol className="absolute inset-0 flex items-end" aria-label={title}>
              {data.map((d, i) => {
                const showCap = series.length === 1 && d.values[0]! > 0 && (i === peak || i === data.length - 1);
                return (
                  <li
                    key={d.key}
                    tabIndex={0}
                    aria-label={`${d.longLabel}: ${series.map((s, si) => `${s.name} ${format(d.values[si] ?? 0)}`).join(", ")}`}
                    className="group relative flex h-full flex-1 items-end justify-center gap-[2px] px-[1px] outline-none"
                  >
                    {/* hover/focus wash: the hit target is the whole column slot */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[4px] bg-foreground/0 transition-colors group-hover:bg-foreground/[0.04] group-focus-visible:bg-foreground/[0.06] group-focus-visible:ring-2 group-focus-visible:ring-ring/50"
                    />
                    {series.map((s, si) => {
                      const v = d.values[si] ?? 0;
                      return (
                        <span
                          key={s.name}
                          aria-hidden="true"
                          className={cn("relative w-full max-w-6 rounded-t-[4px]", s.className, v === 0 && "opacity-0")}
                          style={{ height: `${(v / max) * 100}%` }}
                        />
                      );
                    })}
                    {showCap && (
                      <span
                        aria-hidden="true"
                        className="figure pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1 text-[10px] text-foreground group-hover:opacity-0 group-focus-visible:opacity-0"
                        style={{ bottom: `${(d.values[0]! / max) * 100}%` }}
                      >
                        {format(d.values[0]!)}
                      </span>
                    )}
                    {/* tooltip */}
                    <span
                      role="tooltip"
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-1 hidden min-w-32 rounded-md border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md group-hover:block group-focus-visible:block",
                        i < data.length / 2 ? "left-0" : "right-0",
                      )}
                    >
                      <span className="block text-muted-foreground">{d.longLabel}</span>
                      {series.map((s, si) => (
                        <span key={s.name} className="mt-1 flex items-center gap-2">
                          <span aria-hidden="true" className={cn("h-0.5 w-3 rounded-full", s.className)} />
                          <span className="figure font-medium">{format(d.values[si] ?? 0)}</span>
                          {series.length > 1 && <span className="text-muted-foreground">{s.name}</span>}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* x-axis */}
          <div aria-hidden="true" className="mt-1.5 flex text-[10px] text-muted-foreground">
            {data.map((d, i) => (
              <span
                key={d.key}
                className={cn("flex-1 text-center", dense && (data.length - 1 - i) % 2 === 1 && "max-lg:invisible")}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="text-xs">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground">
          {de.stats.asTable}
        </summary>
        <table className="mt-1 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">{de.stats.month}</th>
              {series.map((s) => (
                <th key={s.name} className="py-1 text-right font-normal">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="figure tabular-nums">
            {data.map((d) => (
              <tr key={d.key} className="border-t">
                <td className="py-1 font-sans">{d.longLabel}</td>
                {series.map((s, si) => (
                  <td key={s.name} className="py-1 text-right">
                    {format(d.values[si] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

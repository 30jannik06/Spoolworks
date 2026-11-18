import { parseStatsRange, STATS_RANGES, type Material, type StatsRange, type WorkshopStats } from "@spoolworks/core";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BarList } from "@/components/stats/bar-list";
import { ColumnChart } from "@/components/stats/column-chart";
import { duration, euros, eurosShort, monthLabel, percent, weight } from "@/components/stats/format";
import { Eyebrow, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { getWorkshopStats } from "@/lib/queries/stats";
import { requireWorkshop } from "@/lib/session";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const s = de.stats;

export const metadata: Metadata = { title: s.title };

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Stats searchParams={searchParams} />
    </Suspense>
  );
}

async function Stats({ searchParams }: { searchParams: PageProps<"/stats">["searchParams"] }) {
  const range = parseStatsRange((await searchParams).range);
  const { workshop } = await requireWorkshop(`/stats?range=${range}`);
  const stats = await getWorkshopStats(workshop.id, range);
  const hasPrints = stats.printed + stats.failed > 0;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{s.title}</h1>
        <p className="text-sm text-muted-foreground">{s.intro}</p>
      </div>

      <RangeFilter current={range} />

      {!hasPrints ? (
        <Tile className="space-y-4 md:p-6">
          <p className="text-sm text-muted-foreground">{s.empty}</p>
          <Button asChild className="h-11">
            <Link href="/prints/new">
              <Plus aria-hidden="true" />
              {s.emptyCta}
            </Link>
          </Button>
        </Tile>
      ) : (
        <Charts stats={stats} />
      )}
    </div>
  );
}

/** One row above everything it scopes: presets as a segmented control of links. */
function RangeFilter({ current }: { current: StatsRange }) {
  return (
    <nav aria-label={s.range} className="inline-flex rounded-lg border bg-card p-1">
      {STATS_RANGES.map((range) => (
        <Link
          key={range}
          href={range === "12m" ? "/stats" : `/stats?range=${range}`}
          aria-current={range === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-4 text-sm transition-colors md:min-h-9",
            range === current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.ranges[range]}
        </Link>
      ))}
    </nav>
  );
}

function StatTile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Tile className="flex flex-col md:p-5">
      <Eyebrow>{label}</Eyebrow>
      <p className="figure mt-2 text-xl md:text-2xl">{value}</p>
      {children}
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Tile>
  );
}

function Charts({ stats }: { stats: WorkshopStats }) {
  const total = stats.printed + stats.failed;
  const months = stats.months.map((m) => ({
    key: m.month,
    label: monthLabel(m.month),
    longLabel: monthLabel(m.month, true),
  }));
  const prints = stats.months.reduce((n, m) => n + m.prints, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label={s.used} value={weight(stats.usedG)} sub={s.usedSub(prints)} />
        <StatTile
          label={s.cost}
          value={euros(stats.costCents)}
          sub={s.costSub(stats.avgCostPerPrintCents === null ? null : euros(stats.avgCostPerPrintCents))}
        />
        <StatTile label={s.success} value={percent(stats.printed, total)} sub={s.successSub(stats.failed, weight(stats.failedG))}>
          {/* meter: success share on a lighter track of the same hue */}
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={stats.printed}
            aria-label={s.success}
            className="mt-2 h-2 rounded-full bg-primary/20"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${(stats.printed / total) * 100}%` }} />
          </div>
        </StatTile>
        <StatTile
          label={s.lasts}
          value={stats.rangeDays === null ? "–" : s.lastsValue(stats.rangeDays)}
          sub={stats.rangeDays === null ? s.lastsNone : s.lastsSub}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <Tile className="space-y-4 md:p-6">
          <h2 className="font-medium">{s.usedChart}</h2>
          <ColumnChart
            title={s.usedChart}
            data={months.map((m, i) => ({ ...m, values: [stats.months[i]!.usedG] }))}
            series={[{ name: s.used, className: "bg-primary" }]}
            format={weight}
          />
        </Tile>
        <Tile className="space-y-4 md:p-6">
          <div>
            <h2 className="font-medium">{s.costChart}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{s.costNote}</p>
          </div>
          <ColumnChart
            title={s.costChart}
            data={months.map((m, i) => ({ ...m, values: [stats.months[i]!.costCents, stats.months[i]!.boughtCents] }))}
            series={[
              { name: s.costSeriesUsed, className: "bg-primary" },
              { name: s.costSeriesBought, className: "bg-chart-5" },
            ]}
            format={euros}
            formatTick={eurosShort}
          />
          {stats.unpricedG > 0 && <p className="text-xs text-muted-foreground">{s.unpriced(weight(stats.unpricedG))}</p>}
        </Tile>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <Tile className="space-y-4 md:p-6">
          <h2 className="font-medium">{s.materials}</h2>
          <BarList
            label={s.materials}
            format={weight}
            items={stats.materials.map((r) => ({
              key: r.key,
              label: de.materials[r.label as Material] ?? r.label,
              value: r.grams,
            }))}
          />
        </Tile>
        <Tile className="space-y-4 md:p-6">
          <h2 className="font-medium">{s.colors}</h2>
          <BarList
            label={s.colors}
            format={weight}
            items={stats.colors.map((r) => ({ key: r.key, label: r.label, value: r.grams, colorHex: r.colorHex }))}
          />
        </Tile>
        <Tile className="space-y-4 md:p-6">
          <h2 className="font-medium">{s.brands}</h2>
          <BarList
            label={s.brands}
            format={weight}
            items={stats.brands.map((r) => ({ key: r.key, label: r.label, value: r.grams }))}
          />
        </Tile>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <Tile className="space-y-4 md:col-span-2 md:p-6">
          <h2 className="font-medium">{s.printTime}</h2>
          {stats.printHoursByPrinter.length > 0 ? (
            <BarList
              label={s.printTime}
              format={duration}
              items={stats.printHoursByPrinter.map((r) => ({ key: r.label || "-", label: r.label || s.noPrinter, value: r.minutes }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{s.printTimeEmpty}</p>
          )}
        </Tile>
        <StatTile label={s.stockValue} value={euros(stats.stockValueCents)} sub={s.stockValueSub(weight(stats.stockG))} />
      </div>
    </>
  );
}

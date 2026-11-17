import { ArrowRight, Plus, Scale, Sparkles } from "lucide-react";
import Link from "next/link";

import { AmsStrip } from "@/components/printers/ams-strip";
import { SpoolRing } from "@/components/spool-ring";
import { Eyebrow, Figure, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import type { PrinterView } from "@/lib/queries/printers";
import type { PrintView } from "@/lib/queries/prints";
import type { SpoolView } from "@/lib/queries/spools";
import { de } from "@/messages/de";

/** Grams → "8,42" kilograms for display. */
function kilograms(grams: number): string {
  return (grams / 1000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The signed-in home: stock, low-stock spools and shortcuts. One column on
 * phones, a 3-column grid from `md` up. The AMS tile shows the first printer;
 * prints arrive in Phase 3 and show their empty state until then.
 */
export function Dashboard({
  userName,
  workshopName,
  lowStockThresholdG,
  stock,
  printer,
  prints,
}: {
  userName: string;
  workshopName: string;
  lowStockThresholdG: number;
  stock: { totalG: number; count: number; low: SpoolView[] };
  printer: PrinterView | null;
  prints: { count: number; latest: PrintView | null };
}) {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{workshopName}</Eyebrow>
          <h1 className="mt-1 text-2xl font-medium tracking-tight md:text-3xl">{de.home.greeting(userName)}</h1>
        </div>
        {stock.count > 0 && (
          <Button asChild variant="outline" className="hidden h-11 md:inline-flex">
            <Link href="/weigh">
              <Scale aria-hidden="true" />
              {de.home.weigh}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <Tile className="md:col-span-2 md:p-6">
          <Eyebrow>{de.home.stockEyebrow}</Eyebrow>
          <Figure
            value={kilograms(stock.totalG)}
            unit={de.home.stockUnit}
            className="mt-3 md:[&>span:first-child]:text-5xl"
          />
          {stock.count > 0 ? (
            <p className="figure mt-3 text-sm text-muted-foreground">{de.home.stockSpools(stock.count)}</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{de.home.stockEmpty}</p>
              <Button asChild className="h-11">
                <Link href="/spools/new">
                  <Plus aria-hidden="true" />
                  {de.home.addFirstSpool}
                </Link>
              </Button>
            </div>
          )}
        </Tile>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
          <Tile className="md:p-6">
            <Eyebrow>{de.home.lowStockEyebrow}</Eyebrow>
            <p className={`figure mt-2 text-xl md:text-2xl ${stock.low.length > 0 ? "text-warning" : ""}`}>
              {stock.low.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{de.home.lowStockThreshold(lowStockThresholdG)}</p>
          </Tile>
          <Link href="/prints" className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent/60 md:p-6">
            <Eyebrow>{de.home.printsEyebrow}</Eyebrow>
            <p className="figure mt-2 text-xl md:text-2xl">{prints.count}</p>
            {prints.latest && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {de.home.printsLast}: {prints.latest.name}
              </p>
            )}
          </Link>
        </div>

        {stock.low.length > 0 && (
          <Tile className="p-0 md:col-span-3">
            <div className="flex items-center justify-between px-4 pt-4 md:px-6 md:pt-5">
              <Eyebrow>{de.home.lowStockEyebrow}</Eyebrow>
              <Link href="/spools?low=1" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                {de.home.lowStockAll}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="divide-y">
              {stock.low.slice(0, 4).map((spool) => (
                <li key={spool.id}>
                  <Link
                    href={`/spools/${spool.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-accent/60 md:px-6"
                  >
                    <SpoolRing fraction={spool.fraction} color={spool.colorHex} size={36} thickness={5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {spool.productLine} {spool.colorName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{spool.brand}</span>
                    </span>
                    <span className="figure text-warning">{spool.remainingG} g</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tile>
        )}

        <Tile className="md:col-span-2 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>{printer ? `${de.home.amsEyebrow} · ${printer.name}` : de.home.amsEyebrow}</Eyebrow>
            {printer && (
              <Link
                href={`/printers/${printer.id}`}
                className="-my-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {de.home.amsOpen}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          {printer && printer.units.length > 0 ? (
            <div className="mt-4 md:max-w-lg">
              <AmsStrip units={printer.units} size={52} />
            </div>
          ) : printer ? (
            <p className="mt-4 text-sm text-muted-foreground">{de.home.amsNoUnits}</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{de.home.amsEmpty}</p>
              <Button asChild variant="outline" className="h-11">
                <Link href="/printers/new">
                  <Plus aria-hidden="true" />
                  {de.home.amsAddPrinter}
                </Link>
              </Button>
            </div>
          )}
        </Tile>

        <Tile className="flex gap-3 md:p-6">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{de.home.nextTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{de.home.nextBody}</p>
          </div>
        </Tile>
      </div>
    </div>
  );
}

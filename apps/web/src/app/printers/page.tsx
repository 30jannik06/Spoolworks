import { ChevronRight, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AmsStrip } from "@/components/printers/ams-strip";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { listPrinters } from "@/lib/queries/printers";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

const p = de.printers;

export default function PrintersPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Printers />
    </Suspense>
  );
}

async function Printers() {
  const { workshop } = await requireWorkshop("/printers");
  const printers = await listPrinters(workshop.id, workshop.lowStockThresholdG);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{p.title}</h1>
          <p className="figure mt-1 text-sm text-muted-foreground">{p.count(printers.length)}</p>
        </div>
        <Button asChild className="h-11 px-4">
          <Link href="/printers/new">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">{p.add}</span>
            <span className="sr-only sm:hidden">{p.add}</span>
          </Link>
        </Button>
      </div>

      {printers.length === 0 ? (
        <Tile className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border bg-background">
            <Printer className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-medium">{p.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{p.emptyBody}</p>
          <Button asChild className="mt-2 h-11 px-5">
            <Link href="/printers/new">
              <Plus aria-hidden="true" />
              {p.add}
            </Link>
          </Button>
        </Tile>
      ) : (
        <ul className="grid gap-3 md:gap-4 lg:grid-cols-2">
          {printers.map((printer) => (
            <li key={printer.id}>
              <Link
                href={`/printers/${printer.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/60 md:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{printer.name}</p>
                    {printer.model && <p className="truncate text-xs text-muted-foreground">{printer.model}</p>}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  {printer.units.length > 0 ? (
                    <AmsStrip units={printer.units} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{p.noUnits}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

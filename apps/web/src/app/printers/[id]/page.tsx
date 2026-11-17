import { MAX_UNITS_PER_PRINTER } from "@spoolworks/core";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/layout/back-link";
import { PrinterActions } from "@/components/printers/printer-actions";
import { UnitPanel } from "@/components/printers/unit-panel";
import { SpoolRing } from "@/components/spool-ring";
import { Tile } from "@/components/tile";
import { assignableSpools, getPrinter } from "@/lib/queries/printers";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

const p = de.printers;

export default function PrinterPage({ params }: PageProps<"/printers/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <PrinterDetail params={params} />
    </Suspense>
  );
}

async function PrinterDetail({ params }: { params: PageProps<"/printers/[id]">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/printers/${id}`);
  const [printer, spools] = await Promise.all([
    getPrinter(workshop.id, id, workshop.lowStockThresholdG),
    assignableSpools(workshop.id, workshop.lowStockThresholdG),
  ]);
  if (!printer) notFound();
  const shelf = spools.filter((spool) => !spool.slot);

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/printers" label={p.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{printer.name}</h1>
        {printer.model && <p className="mt-1 text-sm text-muted-foreground">{printer.model}</p>}
      </div>

      {/* Desktop: units and actions on the left, what is still on the shelf on the right. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-5">
          {printer.units.length === 0 ? (
            <Tile>
              <p className="text-sm text-muted-foreground">{p.noUnits}</p>
            </Tile>
          ) : (
            <div className="grid gap-3 md:gap-4 2xl:grid-cols-2">
              {printer.units.map((unit) => (
                <UnitPanel key={unit.id} unit={unit} spools={spools} printerId={printer.id} />
              ))}
            </div>
          )}
          <PrinterActions printerId={printer.id} canAddUnit={printer.units.length < MAX_UNITS_PER_PRINTER} />
        </div>

        <Tile className="hidden p-0 lg:block">
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="eyebrow">{p.shelfTitle}</p>
            <span className="figure text-xs text-muted-foreground">{shelf.length}</span>
          </div>
          {shelf.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">{p.shelfEmpty}</p>
          ) : (
            <ul className="mt-2 divide-y">
              {shelf.slice(0, 8).map((spool) => (
                <li key={spool.id}>
                  <Link
                    href={`/spools/${spool.id}`}
                    className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-accent/60"
                  >
                    <SpoolRing fraction={spool.fraction} color={spool.colorHex} size={28} thickness={4} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {spool.productLine} {spool.colorName}
                    </span>
                    <span className="figure text-xs text-muted-foreground">{spool.remainingG} g</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {shelf.length > 0 && (
            <Link
              href="/spools?shelf=1"
              className="flex min-h-11 items-center gap-1 border-t px-4 text-sm text-muted-foreground hover:text-foreground"
            >
              {p.shelfAll}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </Tile>
      </div>
    </div>
  );
}

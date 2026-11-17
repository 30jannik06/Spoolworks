import { MAX_UNITS_PER_PRINTER } from "@spoolworks/core";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/layout/back-link";
import { PrinterActions } from "@/components/printers/printer-actions";
import { UnitPanel } from "@/components/printers/unit-panel";
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

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/printers" label={p.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{printer.name}</h1>
        {printer.model && <p className="mt-1 text-sm text-muted-foreground">{printer.model}</p>}
      </div>

      {printer.units.length === 0 ? (
        <Tile>
          <p className="text-sm text-muted-foreground">{p.noUnits}</p>
        </Tile>
      ) : (
        <div className="grid gap-3 md:gap-4 xl:grid-cols-2">
          {printer.units.map((unit) => (
            <UnitPanel key={unit.id} unit={unit} spools={spools} />
          ))}
        </div>
      )}

      <PrinterActions printerId={printer.id} canAddUnit={printer.units.length < MAX_UNITS_PER_PRINTER} />
    </div>
  );
}

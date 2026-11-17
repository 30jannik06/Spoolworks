import { Suspense } from "react";

import { createPrint } from "@/app/prints/actions";
import { BackLink } from "@/components/layout/back-link";
import { PrintForm } from "@/components/prints/print-form";
import { getPrintFormOptions } from "@/lib/queries/prints";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function NewPrintPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <NewPrint />
    </Suspense>
  );
}

/** Today in the workshop's time zone as "YYYY-MM-DD". */
function today(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

async function NewPrint() {
  const { workshop } = await requireWorkshop("/prints/new");
  const { spools, printers } = await getPrintFormOptions(workshop.id, workshop.lowStockThresholdG);
  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/prints" label={de.prints.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.prints.newTitle}</h1>
      </div>
      <PrintForm
        mode="create"
        action={createPrint}
        cancelHref="/prints"
        spools={spools}
        printers={printers}
        defaults={{ printedOn: today() }}
      />
    </div>
  );
}

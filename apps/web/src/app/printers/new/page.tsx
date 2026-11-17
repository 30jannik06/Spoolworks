import { Suspense } from "react";

import { createPrinter } from "@/app/printers/actions";
import { BackLink } from "@/components/layout/back-link";
import { PrinterForm } from "@/components/printers/printer-form";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function NewPrinterPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <NewPrinter />
    </Suspense>
  );
}

async function NewPrinter() {
  await requireWorkshop("/printers/new");
  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/printers" label={de.printers.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.printers.newTitle}</h1>
      </div>
      <PrinterForm mode="create" action={createPrinter} cancelHref="/printers" />
    </div>
  );
}

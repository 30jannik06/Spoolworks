import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updatePrinter } from "@/app/printers/actions";
import { BackLink } from "@/components/layout/back-link";
import { PrinterForm } from "@/components/printers/printer-form";
import { getPrinter } from "@/lib/queries/printers";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function EditPrinterPage({ params }: PageProps<"/printers/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <EditPrinter params={params} />
    </Suspense>
  );
}

async function EditPrinter({ params }: { params: PageProps<"/printers/[id]/edit">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/printers/${id}/edit`);
  const printer = await getPrinter(workshop.id, id, workshop.lowStockThresholdG);
  if (!printer) notFound();

  return (
    <div className="space-y-5">
      <div>
        <BackLink href={`/printers/${printer.id}`} label={printer.name} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.printers.editTitle}</h1>
      </div>
      <PrinterForm
        mode="edit"
        action={updatePrinter.bind(null, printer.id)}
        cancelHref={`/printers/${printer.id}`}
        defaults={{ name: printer.name, model: printer.model ?? undefined }}
      />
    </div>
  );
}

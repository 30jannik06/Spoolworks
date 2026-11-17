import { formatDuration } from "@spoolworks/core";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updatePrint } from "@/app/prints/actions";
import { BackLink } from "@/components/layout/back-link";
import { PrintForm } from "@/components/prints/print-form";
import { getPrint, getPrintFormOptions } from "@/lib/queries/prints";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function EditPrintPage({ params }: PageProps<"/prints/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <EditPrint params={params} />
    </Suspense>
  );
}

async function EditPrint({ params }: { params: PageProps<"/prints/[id]/edit">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/prints/${id}/edit`);
  const print = await getPrint(workshop.id, id);
  if (!print) notFound();
  const { spools, printers } = await getPrintFormOptions(
    workshop.id,
    workshop.lowStockThresholdG,
    print.usages.map((usage) => usage.spoolId),
  );

  return (
    <div className="space-y-5">
      <div>
        <BackLink href={`/prints/${print.id}`} label={print.name} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.prints.editTitle}</h1>
      </div>
      <PrintForm
        mode="edit"
        action={updatePrint.bind(null, print.id)}
        cancelHref={`/prints/${print.id}`}
        spools={spools}
        printers={printers}
        defaults={{
          name: print.name,
          status: print.status,
          printedOn: print.printedOn ?? undefined,
          printerId: print.printer?.id,
          duration: print.durationMin !== null ? formatDuration(print.durationMin) : undefined,
          modelUrl: print.modelUrl ?? undefined,
          notes: print.notes ?? undefined,
          usages: print.usages.map((usage) => ({ spoolId: usage.spoolId, grams: usage.grams })),
        }}
      />
    </div>
  );
}

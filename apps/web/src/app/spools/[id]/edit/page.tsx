import { formatCents } from "@spoolworks/core";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateSpool } from "@/app/spools/actions";
import { BackLink } from "@/components/layout/back-link";
import { SpoolForm } from "@/components/spools/spool-form";
import { getSpool } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function EditSpoolPage({ params }: PageProps<"/spools/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <EditSpool params={params} />
    </Suspense>
  );
}

async function EditSpool({ params }: { params: PageProps<"/spools/[id]/edit">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/spools/${id}/edit`);
  const spool = await getSpool(workshop.id, id, workshop.lowStockThresholdG);
  if (!spool) notFound();

  return (
    <div className="space-y-5">
      <div>
        <BackLink href={`/spools/${spool.id}`} label={`${spool.productLine} ${spool.colorName}`} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.spoolForm.editTitle}</h1>
      </div>
      <SpoolForm
        mode="edit"
        action={updateSpool.bind(null, spool.id)}
        cancelHref={`/spools/${spool.id}`}
        defaults={{
          emptySpoolWeightG: spool.emptySpoolWeightG,
          purchasePrice: spool.purchasePriceCents !== null ? formatCents(spool.purchasePriceCents) : undefined,
          purchasedOn: spool.purchasedOn ?? undefined,
          purchaseUrl: spool.purchaseUrl ?? undefined,
          location: spool.location ?? undefined,
          notes: spool.notes ?? undefined,
        }}
      />
    </div>
  );
}

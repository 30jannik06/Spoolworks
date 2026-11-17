import { Suspense } from "react";

import { BackLink } from "@/components/layout/back-link";
import { WeighPanel } from "@/components/spools/weigh-panel";
import { Tile } from "@/components/tile";
import { listSpools } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

/** Quick action "Spule wiegen": pick a spool, type the gross weight, save. */
export default function WeighPage({ searchParams }: PageProps<"/weigh">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Weigh searchParams={searchParams} />
    </Suspense>
  );
}

async function Weigh({ searchParams }: { searchParams: PageProps<"/weigh">["searchParams"] }) {
  const { workshop } = await requireWorkshop("/weigh");
  const params = await searchParams;
  const spools = await listSpools(workshop.id, workshop.lowStockThresholdG);
  const preselected = typeof params["spool"] === "string" ? params["spool"] : undefined;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <BackLink href="/" label={de.nav.home} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.weigh.title}</h1>
      </div>
      <Tile className="md:p-5">
        <WeighPanel
          initialSpoolId={spools.some((spool) => spool.id === preselected) ? preselected : undefined}
          spools={spools.map((spool) => ({
            id: spool.id,
            label: `${spool.productLine} ${spool.colorName} · ${spool.remainingG} g`,
            colorHex: spool.colorHex,
            emptySpoolWeightG: spool.emptySpoolWeightG,
          }))}
        />
      </Tile>
    </div>
  );
}

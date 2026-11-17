import Link from "next/link";

import { SpoolRing } from "@/components/spool-ring";
import type { SpoolView } from "@/lib/queries/spools";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

/** One spool in the library: ring, product, place and the remaining grams. */
export function SpoolCard({ spool }: { spool: SpoolView }) {
  return (
    <Link
      href={`/spools/${spool.id}`}
      className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/60 md:p-4"
    >
      <SpoolRing
        fraction={spool.fraction}
        color={spool.colorHex}
        size={48}
        thickness={6}
        label={`${spool.colorName}, ${spool.remainingG} g`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {spool.productLine} {spool.colorName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {spool.brand} · {de.materials[spool.material]} ·{" "}
          {spool.slot
            ? de.printers.place(spool.slot.printerName, spool.slot.unitPosition, spool.slot.slotCount, spool.slot.slotPosition)
            : (spool.location ?? de.spools.shelf)}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("figure text-lg leading-tight", spool.low && "text-warning")}>
          {spool.remainingG.toLocaleString("de-DE")} g
        </p>
        <p className="text-[11px] text-muted-foreground">
          {spool.status === "ARCHIVED" ? de.spools.archived : spool.low ? de.spools.low : de.spools.of(spool.netWeightG)}
        </p>
      </div>
    </Link>
  );
}

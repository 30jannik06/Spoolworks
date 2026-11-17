import { SpoolRing } from "@/components/spool-ring";
import type { UnitView } from "@/lib/queries/printers";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const p = de.printers;

/**
 * Read-only overview of a printer's units: one row of rings per unit with a
 * short position label. Used on the printer list and the dashboard.
 */
export function AmsStrip({ units, size = 48 }: { units: UnitView[]; size?: number }) {
  return (
    <div className="space-y-3">
      {units.map((unit) => (
        <div key={unit.id} className="flex items-center gap-3">
          <span className="eyebrow w-14 shrink-0">{p.unitShort(unit.position, unit.slotCount)}</span>
          <ul className="grid flex-1 grid-cols-4 gap-2">
            {unit.slots.map((slot) => (
              <li key={slot.id} className="flex flex-col items-center gap-1">
                <SpoolRing
                  fraction={slot.spool?.fraction ?? 0}
                  color={slot.spool?.colorHex}
                  size={size}
                  thickness={Math.round(size / 8)}
                  label={
                    slot.spool
                      ? `${slot.spool.productLine} ${slot.spool.colorName}, ${slot.spool.remainingG} g`
                      : p.emptySlot
                  }
                />
                <span className={cn("figure text-[11px] text-muted-foreground", slot.spool?.low && "text-warning")}>
                  {slot.spool ? `${slot.spool.remainingG} g` : p.emptySlot}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

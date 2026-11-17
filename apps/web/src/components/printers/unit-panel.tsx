"use client";

import { ArrowLeftRight, Search, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { assignSlot, removeUnit } from "@/app/printers/actions";
import { SpoolRing } from "@/components/spool-ring";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/error-text";
import type { SlotView, UnitView } from "@/lib/queries/printers";
import type { SpoolView } from "@/lib/queries/spools";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const p = de.printers;

/**
 * One feeder unit: its slots as rings. Tapping a slot opens a picker with the
 * workshop's active spools (shelf first); picking one loads it, moving it out
 * of any other slot.
 */
export function UnitPanel({ unit, spools, printerId }: { unit: UnitView; spools: SpoolView[]; printerId: string }) {
  const [picking, setPicking] = useState<SlotView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const unitName = p.unitName(unit.position, unit.slotCount);
  const used = unit.slots.filter((slot) => slot.spool).length;

  return (
    <Tile className="space-y-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{unitName}</p>
          <p className="figure text-xs text-muted-foreground">{p.loaded(used, unit.slotCount)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="size-11 text-muted-foreground"
          aria-label={p.removeUnit}
          title={p.removeUnit}
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <ul className={cn("grid gap-2 md:gap-3", unit.slotCount === 1 ? "grid-cols-1 sm:max-w-[25%]" : "grid-cols-4")}>
        {unit.slots.map((slot) => (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => {
                setError(undefined);
                setPicking(slot);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-lg border px-1 py-3 text-center transition-colors hover:bg-accent/60 md:px-2 md:py-4"
            >
              <SpoolRing
                fraction={slot.spool?.fraction ?? 0}
                color={slot.spool?.colorHex}
                size={56}
                thickness={7}
                label={slot.spool ? `${slot.spool.colorName}, ${slot.spool.remainingG} g` : p.emptySlot}
              />
              <span className="eyebrow">{p.slotName(slot.position)}</span>
              {slot.spool ? (
                <span className="w-full min-w-0">
                  <span className="block truncate text-xs font-medium md:text-sm">{slot.spool.colorName}</span>
                  <span
                    className={cn(
                      "figure block text-[11px] text-muted-foreground md:text-xs",
                      slot.spool.low && "text-warning",
                    )}
                  >
                    {slot.spool.remainingG} g
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{p.emptySlot}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {error && !picking && (
        <p className="text-sm text-destructive" role="alert">
          {errorText(error)}
        </p>
      )}

      {confirming && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alertdialog">
          <p className="text-sm">{p.removeUnitConfirm}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(false)}>
              {p.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeUnit(unit.id);
                  if (!result.ok) setError(result.error);
                  setConfirming(false);
                })
              }
            >
              {p.removeUnitYes}
            </Button>
          </div>
        </div>
      )}

      <SlotPicker
        slot={picking}
        title={picking ? p.pickTitle(unit.slotCount === 1 ? unitName : `${unitName} · ${p.slotName(picking.position)}`) : ""}
        spools={spools}
        printerId={printerId}
        onClose={() => setPicking(null)}
      />
    </Tile>
  );
}

function SlotPicker({
  slot,
  title,
  spools,
  printerId,
  onClose,
}: {
  slot: SlotView | null;
  title: string;
  spools: SpoolView[];
  printerId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return spools.filter((spool) => {
      if (spool.id === slot?.spool?.id) return false;
      const haystack = `${spool.brand} ${spool.productLine} ${spool.colorName} ${spool.material}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, spools, slot]);

  function pick(spoolId: string) {
    if (!slot) return;
    startTransition(async () => {
      const result = await assignSlot(slot.id, spoolId);
      if (result.ok) {
        setQuery("");
        setError(undefined);
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={slot !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(undefined);
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{p.pickFilter}</DialogDescription>
        </DialogHeader>

        {slot?.spool && (
          <button
            type="button"
            disabled={pending}
            onClick={() => pick("")}
            className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-accent/60"
          >
            <Undo2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{p.clearSlot}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {p.clearSlotHint}: {slot.spool.productLine} {slot.spool.colorName}
              </span>
            </span>
          </button>
        )}

        {spools.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{p.pickNoSpools}</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={p.pickFilter}
                aria-label={p.pickFilter}
                className="h-11 pl-9 text-base md:text-sm"
                autoComplete="off"
              />
            </div>
            <ul className="-mx-1 min-h-0 flex-1 divide-y overflow-y-auto px-1">
              {visible.map((spool) => (
                <li key={spool.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(spool.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left hover:bg-accent/60 disabled:opacity-60"
                  >
                    <SpoolRing fraction={spool.fraction} color={spool.colorHex} size={36} thickness={5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {spool.productLine} {spool.colorName}
                      </span>
                      {spool.slot ? (
                        // Already loaded elsewhere: say where, since picking it moves it.
                        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <ArrowLeftRight className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {spool.slot.printerId === printerId
                              ? p.unitPlace(spool.slot.unitPosition, spool.slot.slotCount, spool.slot.slotPosition)
                              : p.place(
                                  spool.slot.printerName,
                                  spool.slot.unitPosition,
                                  spool.slot.slotCount,
                                  spool.slot.slotPosition,
                                )}
                          </span>
                        </span>
                      ) : (
                        <span className="block truncate text-xs text-muted-foreground">
                          {spool.brand} · {p.pickShelf}
                        </span>
                      )}
                    </span>
                    <span className={cn("figure text-sm", spool.low && "text-warning")}>{spool.remainingG} g</span>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="py-4 text-sm text-muted-foreground">{p.pickNone}</li>}
            </ul>
          </>
        )}

        {pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            {p.pickSaving}
          </p>
        ) : error ? (
          <p className="text-sm text-destructive" role="alert">
            {errorText(error)}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

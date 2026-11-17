"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { addUnit, deletePrinter } from "@/app/printers/actions";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-text";
import { de } from "@/messages/de";

const p = de.printers;

/** Add units, edit and delete. Deleting asks for confirmation inline. */
export function PrinterActions({ printerId, canAddUnit }: { printerId: string; canAddUnit: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function add(slotCount: "4" | "1") {
    setError(undefined);
    startTransition(async () => {
      const result = await addUnit(printerId, slotCount);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canAddUnit && (
          <>
            <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => add("4")}>
              <Plus aria-hidden="true" />
              {p.addAms}
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => add("1")}>
              <Plus aria-hidden="true" />
              {p.addSingle}
            </Button>
          </>
        )}
        <Button asChild variant="outline" className="h-11">
          <Link href={`/printers/${printerId}/edit`}>
            <Pencil aria-hidden="true" />
            {p.edit}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-destructive hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden="true" />
          {p.delete}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {errorText(error)}
        </p>
      )}
      {confirming && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alertdialog">
          <p className="text-sm">{p.deleteConfirm}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(false)}>
              {p.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={pending}
              onClick={() => startTransition(async () => void (await deletePrinter(printerId)))}
            >
              {p.deleteYes}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

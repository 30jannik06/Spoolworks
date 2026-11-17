"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteSpool, setSpoolArchived } from "@/app/spools/actions";
import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

const d = de.spoolDetail;

/** Edit, archive and delete. Deleting asks for confirmation inline. */
export function SpoolActions({ spoolId, archived }: { spoolId: string; archived: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11">
          <Link href={`/spools/${spoolId}/edit`}>
            <Pencil aria-hidden="true" />
            {d.edit}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={pending}
          onClick={() => startTransition(async () => void (await setSpoolArchived(spoolId, !archived)))}
        >
          {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
          {archived ? d.unarchive : d.archive}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-destructive hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden="true" />
          {d.delete}
        </Button>
      </div>
      {confirming && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alertdialog">
          <p className="text-sm">{d.deleteConfirm}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(false)}>
              {de.spoolForm.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={pending}
              onClick={() => startTransition(async () => void (await deleteSpool(spoolId)))}
            >
              {d.deleteYes}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

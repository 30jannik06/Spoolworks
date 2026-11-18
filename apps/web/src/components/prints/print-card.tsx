import { Link2 } from "lucide-react";
import Link from "next/link";

import type { PrintView } from "@/lib/queries/prints";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const p = de.prints;

export const printDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Status pill; printed prints need none, so only failed and planned get one. */
export function PrintStatusBadge({ status }: { status: PrintView["status"] }) {
  if (status === "PRINTED") return null;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs",
        status === "FAILED" ? "border-destructive/40 text-destructive" : "text-muted-foreground",
      )}
    >
      {p.status[status]}
    </span>
  );
}

/**
 * One print in the gallery: its cover photo if it has one, and always the
 * filament colours it used as a band (one stripe per spool, sized by grams).
 */
export function PrintCard({ print }: { print: PrintView }) {
  return (
    <Link
      href={`/prints/${print.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:bg-accent/60"
    >
      {print.photos[0] && (
        // eslint-disable-next-line @next/next/no-img-element -- private photo, served after a permission check
        <img
          src={`/photos/${print.photos[0].id}?size=thumb`}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full bg-muted object-cover"
        />
      )}
      <div className="flex h-2 w-full bg-muted" aria-hidden="true">
        {print.usages.map((usage) => (
          <span key={usage.spoolId} style={{ backgroundColor: usage.colorHex, flexGrow: usage.grams }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{print.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {print.printedOn ? printDate.format(new Date(`${print.printedOn}T00:00:00Z`)) : p.undated}
              {print.printer ? ` · ${print.printer.name}` : ""}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            {print.shareToken && (
              <Link2 className="size-4 text-muted-foreground" aria-label={de.share.sharedBadge} />
            )}
            <PrintStatusBadge status={print.status} />
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex -space-x-1">
            {print.usages.slice(0, 6).map((usage) => (
              <span
                key={usage.spoolId}
                title={`${usage.productLine} ${usage.colorName}`}
                className="size-5 rounded-full border-2 border-card"
                style={{ backgroundColor: usage.colorHex }}
              />
            ))}
          </div>
          <p className="figure text-sm text-muted-foreground">{print.totalG > 0 ? p.totalShort(print.totalG) : "–"}</p>
        </div>
      </div>
    </Link>
  );
}

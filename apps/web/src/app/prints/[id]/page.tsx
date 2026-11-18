import { formatDuration } from "@spoolworks/core";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/layout/back-link";
import { PrintActions } from "@/components/prints/print-actions";
import { PrintStatusBadge, printDate } from "@/components/prints/print-card";
import { SharePanel } from "@/components/prints/share-panel";
import { Eyebrow, Tile } from "@/components/tile";
import { getPrint } from "@/lib/queries/prints";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

const p = de.prints;

export default function PrintPage({ params }: PageProps<"/prints/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <PrintDetail params={params} />
    </Suspense>
  );
}

async function PrintDetail({ params }: { params: PageProps<"/prints/[id]">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/prints/${id}`);
  const print = await getPrint(workshop.id, id);
  if (!print) notFound();

  const facts = [
    {
      label: p.printedOn,
      value: print.printedOn ? printDate.format(new Date(`${print.printedOn}T00:00:00Z`)) : p.undated,
    },
    { label: p.duration, value: print.durationMin !== null ? `${formatDuration(print.durationMin)} h` : "–" },
    { label: p.printer, value: print.printer?.name ?? "–" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/prints" label={p.title} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{print.name}</h1>
          <PrintStatusBadge status={print.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
        <Tile className="p-0 md:p-0 lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-between px-4 pt-4 md:px-5">
            <Eyebrow>{p.usageSection}</Eyebrow>
            <span className="figure text-lg">{p.totalShort(print.totalG)}</span>
          </div>
          {print.status === "PLANNED" && (
            <p className="px-4 pt-1 text-xs text-muted-foreground md:px-5">{p.statusHint.PLANNED}</p>
          )}
          {print.usages.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">{p.noUsage}</p>
          ) : (
            <ul className="mt-2 divide-y">
              {print.usages.map((usage) => (
                <li key={usage.spoolId}>
                  <Link
                    href={`/spools/${usage.spoolId}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-accent/60 md:px-5"
                  >
                    <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: usage.colorHex }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {usage.productLine} {usage.colorName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {usage.brand}
                        {usage.archived ? ` · ${p.archivedSpool}` : ""}
                      </span>
                    </span>
                    <span className="figure">{usage.grams.toLocaleString("de-DE")} g</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((fact, index) => (
              <Tile key={fact.label} className={index === 2 ? "col-span-2 sm:col-span-1" : undefined}>
                <Eyebrow>{fact.label}</Eyebrow>
                <p className="figure mt-1.5 truncate text-base">{fact.value}</p>
              </Tile>
            ))}
          </div>
          {print.modelUrl && (
            <a
              href={print.modelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-between gap-2 rounded-xl border bg-card px-4 text-sm hover:bg-accent/60"
            >
              {p.source[print.modelSource ?? "OTHER"]}
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            </a>
          )}
          {print.notes && (
            <Tile>
              <p className="text-sm whitespace-pre-line">{print.notes}</p>
            </Tile>
          )}
          <SharePanel
            printId={print.id}
            token={print.shareToken}
            galleryHandle={workshop.galleryPublic ? workshop.publicHandle : null}
          />
          <PrintActions printId={print.id} />
        </div>
      </div>
    </div>
  );
}

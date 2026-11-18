import { formatDuration } from "@spoolworks/core";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { PrintStatusBadge, printDate } from "@/components/prints/print-card";
import { Eyebrow, Tile } from "@/components/tile";
import type { PublicPrint } from "@/lib/queries/public";
import { de } from "@/messages/de";

const p = de.prints;
const pub = de.publicPage;

function dateText(printedOn: string | null) {
  return printedOn ? printDate.format(new Date(`${printedOn}T00:00:00Z`)) : p.undated;
}

/** Colour band: one stripe per filament, sized by grams. */
function ColorBand({ print, className }: { print: PublicPrint; className?: string }) {
  return (
    <div className={`flex w-full bg-muted ${className ?? ""}`} aria-hidden="true">
      {print.usages.map((usage, index) => (
        <span key={index} style={{ backgroundColor: usage.colorHex, flexGrow: usage.grams }} />
      ))}
    </div>
  );
}

/** Shared photos, addressed by token and position (0 = cover), never by id. */
function PublicPhotos({ print }: { print: PublicPrint }) {
  if (print.photos.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-2">
      {print.photos.map((photo, index) => (
        <li key={index} className={index === 0 ? "col-span-2" : undefined}>
          <a href={`/p/${print.token}/photos/${index}`} target="_blank" rel="noopener" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, never cached */}
            <img
              src={index === 0 ? `/p/${print.token}/photos/0` : `/p/${print.token}/photos/${index}?size=thumb`}
              alt={index === 0 ? de.photos.coverAlt : de.photos.photoAlt(index + 1)}
              width={photo.width}
              height={photo.height}
              className="aspect-[4/3] w-full rounded-lg border bg-muted object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A shared print for visitors. Server-only, renders exactly the public fields. */
export function PublicPrintView({ print, galleryHandle }: { print: PublicPrint; galleryHandle: string | null }) {
  const facts = [
    { label: p.printedOn, value: dateText(print.printedOn) },
    { label: p.duration, value: print.durationMin !== null ? `${formatDuration(print.durationMin)} h` : "–" },
    { label: p.printer, value: print.printerName ?? "–" },
  ];

  return (
    <div className="space-y-5">
      <div>
        {galleryHandle && (
          <Link
            href={`/u/${galleryHandle}`}
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← {pub.galleryLink(galleryHandle)}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{print.name}</h1>
          <PrintStatusBadge status={print.status} />
        </div>
      </div>

      <ColorBand print={print} className="h-2 overflow-hidden rounded-sm" />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
        <Tile className="p-0 md:p-0 lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-between px-4 pt-4 md:px-5">
            <Eyebrow>{pub.filaments}</Eyebrow>
            <span className="figure text-lg">{p.totalShort(print.totalG)}</span>
          </div>
          {print.usages.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">{p.noUsage}</p>
          ) : (
            <ul className="mt-2 divide-y">
              {print.usages.map((usage, index) => (
                <li key={index} className="flex min-h-14 items-center gap-3 px-4 py-2.5 md:px-5">
                  <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: usage.colorHex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {usage.productLine} {usage.colorName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {usage.brand} · {de.materials[usage.material]}
                    </span>
                  </span>
                  <span className="figure">{usage.grams.toLocaleString("de-DE")} g</span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <PublicPhotos print={print} />
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
              rel="noopener noreferrer nofollow"
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
        </div>
      </div>
    </div>
  );
}

/** Gallery card for visitors: links to the secret print link, never to an id. */
export function PublicPrintCard({ print }: { print: PublicPrint }) {
  return (
    <Link
      href={`/p/${print.token}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:bg-accent/60"
    >
      {print.photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own route, never cached
        <img
          src={`/p/${print.token}/photos/0?size=thumb`}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full bg-muted object-cover"
        />
      )}
      <ColorBand print={print} className="h-2" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{print.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dateText(print.printedOn)}
              {print.printerName ? ` · ${print.printerName}` : ""}
            </p>
          </div>
          <PrintStatusBadge status={print.status} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex -space-x-1">
            {print.usages.slice(0, 6).map((usage, index) => (
              <span
                key={index}
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

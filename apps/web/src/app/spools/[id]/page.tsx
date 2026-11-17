import { formatCents } from "@spoolworks/core";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/layout/back-link";
import { SpoolRing } from "@/components/spool-ring";
import { SpoolActions } from "@/components/spools/spool-actions";
import { WeighPanel } from "@/components/spools/weigh-panel";
import { Eyebrow, Tile } from "@/components/tile";
import { getSpool, getSpoolLedger } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const d = de.spoolDetail;

export default function SpoolPage({ params }: PageProps<"/spools/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <SpoolDetail params={params} />
    </Suspense>
  );
}

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

async function SpoolDetail({ params }: { params: PageProps<"/spools/[id]">["params"] }) {
  const { id } = await params;
  const { workshop } = await requireWorkshop(`/spools/${id}`);
  const [spool, ledger] = await Promise.all([
    getSpool(workshop.id, id, workshop.lowStockThresholdG),
    getSpoolLedger(workshop.id, id),
  ]);
  if (!spool) notFound();

  // Price per kilogram from the purchase price and the nominal net weight, in cents.
  const pricePerKgCents =
    spool.purchasePriceCents !== null && spool.netWeightG > 0
      ? Math.round((spool.purchasePriceCents * 1000) / spool.netWeightG)
      : null;

  const facts: { label: string; value: string; detail?: string; href?: string }[] = [
    // The slot is shown next to the user's own location text, never instead of it.
    ...(spool.slot
      ? [
          {
            label: d.slot,
            value: spool.slot.printerName,
            detail: de.printers.unitPlace(spool.slot.unitPosition, spool.slot.slotCount, spool.slot.slotPosition),
            href: `/printers/${spool.slot.printerId}`,
          },
        ]
      : []),
    { label: d.emptySpool, value: `${spool.emptySpoolWeightG} g` },
    { label: d.pricePerKg, value: pricePerKgCents !== null ? `${formatCents(pricePerKgCents)} €` : d.noValue },
    {
      label: d.purchased,
      value: spool.purchasedOn ? dateFormat.format(new Date(`${spool.purchasedOn}T00:00:00Z`)) : d.noValue,
    },
    { label: d.location, value: spool.location ?? (spool.slot ? d.noValue : de.spools.shelf) },
    { label: d.code, value: spool.shortCode },
  ];

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/spools" label={de.spools.title} />
        <div className="mt-2 flex items-center gap-3">
          <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: spool.colorHex }} />
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
            {spool.productLine} {spool.colorName}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {spool.brand} · {de.materials[spool.material]} · {spool.diameterUm === 2850 ? "2,85" : "1,75"} mm
        </p>
      </div>

      {/* Phones: ring, then the keypad (you are standing at the scale), then details.
          Desktop: details on the left, keypad sticky on the right. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
          <Tile className="flex flex-col items-center gap-5 py-8 sm:flex-row sm:justify-center sm:gap-10 md:p-8 lg:col-start-1 lg:row-start-1">
            <SpoolRing
              fraction={spool.fraction}
              color={spool.colorHex}
              size={168}
              thickness={16}
              label={`${spool.remainingG} g`}
            >
              <span className="text-center">
                <span className="eyebrow block">{d.remaining}</span>
                <span className={cn("figure block text-3xl", spool.low && "text-warning")}>
                  {spool.remainingG.toLocaleString("de-DE")}
                </span>
                <span className="text-xs text-muted-foreground">g</span>
              </span>
            </SpoolRing>
            <div className="text-center sm:text-left">
              <p className="figure text-sm text-muted-foreground">{d.ofNet(spool.netWeightG)}</p>
              <p className="figure mt-1 text-2xl">{Math.round(spool.fraction * 100)} %</p>
              {spool.low && <p className="mt-2 text-sm text-warning">{de.spools.low}</p>}
            </div>
          </Tile>

        <Tile className="md:p-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <WeighPanel
            spools={[
              {
                id: spool.id,
                label: `${spool.productLine} ${spool.colorName}`,
                colorHex: spool.colorHex,
                emptySpoolWeightG: spool.emptySpoolWeightG,
              },
            ]}
          />
        </Tile>

        <div className="space-y-4 lg:col-start-1 lg:row-start-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {facts.map((fact) =>
              fact.href ? (
                <Link
                  key={fact.label}
                  href={fact.href}
                  className="col-span-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/60 md:col-span-1"
                >
                  <Eyebrow>{fact.label}</Eyebrow>
                  <p className="mt-1.5 truncate text-base">{fact.value}</p>
                  {fact.detail && <p className="figure truncate text-xs text-muted-foreground">{fact.detail}</p>}
                </Link>
              ) : (
                <Tile key={fact.label}>
                  <Eyebrow>{fact.label}</Eyebrow>
                  <p className="figure mt-1.5 truncate text-base">{fact.value}</p>
                </Tile>
              ),
            )}
            {spool.purchaseUrl && (
              <a
                href={spool.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm hover:bg-accent/60"
              >
                {d.shop}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>

          {spool.notes && (
            <Tile>
              <p className="text-sm whitespace-pre-line">{spool.notes}</p>
            </Tile>
          )}

          <Tile className="p-0">
            <p className="eyebrow px-4 pt-4">{d.history}</p>
            {ledger.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{d.historyEmpty}</p>
            ) : (
              <ul className="mt-2 divide-y">
                {ledger.map((entry) => (
                  <li key={entry.seq} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className={cn(!entry.active && "text-muted-foreground line-through")}>
                      {d.ledger[entry.kind]}
                    </span>
                    <span className="flex items-baseline gap-3">
                      <span className="text-xs text-muted-foreground">{dateTimeFormat.format(entry.createdAt)}</span>
                      <span className="figure">
                        {entry.kind === "PRINT" ? "−" : ""}
                        {entry.valueG.toLocaleString("de-DE")} g
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tile>

          <SpoolActions spoolId={spool.id} archived={spool.status === "ARCHIVED"} />
        </div>
      </div>
    </div>
  );
}

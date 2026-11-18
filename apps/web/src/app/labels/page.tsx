import { LABEL_PRESETS, findLabelPreset, labelsPerSheet, layoutLabelSheets } from "@spoolworks/core";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Field, Select, inputClass } from "@/components/form/field";
import { LabelSheets } from "@/components/labels/label-sheet";
import { PrintButton } from "@/components/labels/print-button";
import { SheetScaler } from "@/components/labels/sheet-scaler";
import { BackLink } from "@/components/layout/back-link";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelOrigin } from "@/lib/label-origin";
import { listLabelSpools } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

const l = de.labels;

/**
 * Label sheet builder. Everything lives in the URL (?id=…&id=…&preset=&skip=&cut=1),
 * so the form is a plain GET form and a spool page can link straight to its label.
 */
export default function LabelsPage({ searchParams }: PageProps<"/labels">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Labels searchParams={searchParams} />
    </Suspense>
  );
}

async function Labels({ searchParams }: { searchParams: PageProps<"/labels">["searchParams"] }) {
  const { workshop } = await requireWorkshop("/labels");
  const params = await searchParams;
  const [spools, { origin, production }] = await Promise.all([listLabelSpools(workshop.id), labelOrigin()]);

  const ids = new Set([params["id"]].flat().filter((id): id is string => typeof id === "string"));
  const preset = findLabelPreset(typeof params["preset"] === "string" ? params["preset"] : undefined);
  const perSheet = labelsPerSheet(preset);
  const skipRaw = typeof params["skip"] === "string" ? Number.parseInt(params["skip"], 10) : 0;
  const skip = Number.isFinite(skipRaw) ? Math.min(Math.max(skipRaw, 0), perSheet - 1) : 0;
  const cut = params["cut"] === "1";
  // Only this workshop's spools can be picked; foreign or stale ids are ignored.
  const selected = params["all"] === "1" ? spools : spools.filter((spool) => ids.has(spool.id));
  const sheetCount = layoutLabelSheets(preset, selected.length, skip).length;

  const keep = (extra: string) => {
    const query = new URLSearchParams({
      preset: preset.id,
      skip: String(skip),
      ...(cut ? { cut: "1" } : {}),
    });
    return `/labels?${query.toString()}${extra}`;
  };

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <BackLink href="/spools" label={de.spools.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{l.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{l.intro}</p>
      </div>

      {!production && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm print:hidden">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {l.localOrigin(origin)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
        <form method="get" action="/labels" className="space-y-4 print:hidden lg:sticky lg:top-6">
          <Tile className="space-y-4 md:p-5">
            <Field label={l.sheetLabel} htmlFor="preset">
              <Select id="preset" name="preset" defaultValue={preset.id}>
                {LABEL_PRESETS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {l.preset(option.id, labelsPerSheet(option))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={l.skip} htmlFor="skip" hint={l.skipHint}>
              <Input
                id="skip"
                name="skip"
                type="number"
                inputMode="numeric"
                min={0}
                max={perSheet - 1}
                defaultValue={skip}
                className={inputClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="cut" value="1" defaultChecked={cut} className="size-5 accent-primary" />
              {l.cut}
            </label>
          </Tile>

          <Tile className="p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <p className="eyebrow">{l.pickTitle}</p>
              <span className="flex gap-1">
                <Button asChild variant="ghost" className="h-11 px-3">
                  <Link href={keep("&all=1")}>{l.pickAll}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-3">
                  <Link href={keep("")}>{l.pickNone}</Link>
                </Button>
              </span>
            </div>
            {spools.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{l.noSpools}</p>
            ) : (
              <ul className="max-h-[50vh] divide-y overflow-y-auto lg:max-h-[60vh]">
                {spools.map((spool) => (
                  <li key={spool.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-accent/60">
                      <input
                        type="checkbox"
                        name="id"
                        value={spool.id}
                        defaultChecked={selected.includes(spool)}
                        className="size-5 shrink-0 accent-primary"
                      />
                      <span
                        className="size-3.5 shrink-0 rounded-full border"
                        style={{ backgroundColor: spool.colorHex }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {spool.productLine} {spool.colorName}
                        </span>
                        <span className="figure block truncate text-xs text-muted-foreground">
                          {spool.brand} · {spool.shortCode}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Tile>

          <Button type="submit" variant="outline" className="h-11 w-full">
            {l.apply}
          </Button>
        </form>

        <div className="order-first min-w-0 space-y-4 lg:order-none">
          {selected.length === 0 ? (
            <Tile className="py-10 text-center text-sm text-muted-foreground print:hidden">{l.empty}</Tile>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div>
                  <p className="figure text-sm">{l.summary(selected.length, sheetCount)}</p>
                  <p className="text-xs text-muted-foreground">{l.printHint}</p>
                </div>
                <PrintButton />
              </div>
              <SheetScaler>
                <LabelSheets spools={selected} preset={preset} skip={skip} cut={cut} origin={origin} />
              </SheetScaler>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

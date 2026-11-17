"use client";

import { MATERIALS } from "@spoolworks/core";
import { Check, Search } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";

import { findProducts } from "@/app/spools/actions";
import { ColorPicker } from "@/components/form/color-picker";
import { DatePicker } from "@/components/form/date-picker";
import { Field, Select, inputClass } from "@/components/form/field";
import { Segmented } from "@/components/segmented";
import { SpoolRing } from "@/components/spool-ring";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { errorText } from "@/lib/error-text";
import type { ProductOption } from "@/lib/queries/spools";
import { de } from "@/messages/de";

const f = de.spoolForm;

/** "Bambu Lab · PLA · 1000 g", plus diameter when not 1.75 mm and a note when no longer sold. */
function productMeta(product: ProductOption): string {
  return [
    product.brand,
    de.materials[product.material],
    `${product.netWeightG} g`,
    product.diameterUm !== 1750 ? f.diameterShort(product.diameterUm) : null,
    product.discontinued ? f.discontinued : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

type Defaults = {
  emptySpoolWeightG?: number;
  purchasePrice?: string;
  purchasedOn?: string;
  purchaseUrl?: string;
  location?: string;
  notes?: string;
};

type Props =
  | { mode: "create"; action: (prev: ActionState, data: FormData) => Promise<ActionState>; cancelHref: string }
  | {
      mode: "edit";
      action: (prev: ActionState, data: FormData) => Promise<ActionState>;
      cancelHref: string;
      defaults: Defaults;
    };

export function SpoolForm(props: Props) {
  const [state, formAction, pending] = useActionState(props.action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const defaults = props.mode === "edit" ? props.defaults : {};

  // Pre-fill from a picked catalog product; the user can still overwrite.
  const [emptySpool, setEmptySpool] = useState(defaults.emptySpoolWeightG?.toString() ?? "");
  const [initialNet, setInitialNet] = useState("1000");

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-6">
      {props.mode === "create" && (
        <ProductSection
          errors={errors}
          onPick={(product) => {
            if (product.spoolWeightG !== null) setEmptySpool(String(product.spoolWeightG));
            setInitialNet(String(product.netWeightG));
          }}
        />
      )}

      <Tile className="space-y-4 md:p-6">
        <p className="eyebrow">{f.spoolSection}</p>
        {props.mode === "create" && (
          <Field label={f.initialNet} htmlFor="initialNetG" hint={f.initialNetHint} error={errors["initialNetG"]}>
            <Input
              id="initialNetG"
              name="initialNetG"
              inputMode="numeric"
              value={initialNet}
              onChange={(event) => setInitialNet(event.target.value)}
              className={inputClass}
              required
            />
          </Field>
        )}
        <Field label={f.emptySpool} htmlFor="emptySpoolWeightG" hint={f.emptySpoolHint} error={errors["emptySpoolWeightG"]}>
          <Input
            id="emptySpoolWeightG"
            name="emptySpoolWeightG"
            inputMode="numeric"
            value={emptySpool}
            onChange={(event) => setEmptySpool(event.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.price} htmlFor="purchasePriceCents" error={errors["purchasePriceCents"]}>
            <Input
              id="purchasePriceCents"
              name="purchasePriceCents"
              inputMode="decimal"
              placeholder={f.pricePlaceholder}
              defaultValue={defaults.purchasePrice}
              className={inputClass}
            />
          </Field>
          <Field label={f.purchasedOn} htmlFor="purchasedOn" error={errors["purchasedOn"]}>
            <DatePicker id="purchasedOn" name="purchasedOn" defaultValue={defaults.purchasedOn} disableFuture />
          </Field>
        </div>
        <Field label={f.purchaseUrl} htmlFor="purchaseUrl" error={errors["purchaseUrl"]}>
          <Input
            id="purchaseUrl"
            name="purchaseUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={defaults.purchaseUrl}
            className={inputClass}
          />
        </Field>
        <Field label={f.location} htmlFor="location" error={errors["location"]}>
          <Input
            id="location"
            name="location"
            placeholder={f.locationPlaceholder}
            defaultValue={defaults.location}
            className={inputClass}
          />
        </Field>
        <Field label={f.notes} htmlFor="notes" error={errors["notes"]}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
        </Field>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {errorText(state.error)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-11">
            <Link href={props.cancelHref}>{f.cancel}</Link>
          </Button>
          <Button type="submit" className="h-11 px-5" disabled={pending}>
            {pending ? f.pending : props.mode === "create" ? f.submitNew : f.submitEdit}
          </Button>
        </div>
      </Tile>
    </form>
  );
}

function ProductSection({
  errors,
  onPick,
}: {
  errors: Record<string, string>;
  onPick: (product: ProductOption) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [picked, setPicked] = useState<ProductOption | null>(null);
  const [searching, startSearch] = useTransition();
  const [colorName, setColorName] = useState("");

  // Debounced catalog search through a server action.
  useEffect(() => {
    if (mode !== "existing" || picked || query.trim().length < 2) return;
    const timer = setTimeout(() => {
      startSearch(async () => setResults(await findProducts(query)));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, mode, picked]);

  return (
    <Tile className="space-y-4 md:p-6">
      <p className="eyebrow">{f.productSection}</p>
      <input type="hidden" name="mode" value={mode} />
      <Segmented
        label={f.productSection}
        value={mode}
        onChange={setMode}
        options={[
          { value: "existing", label: f.modeExisting },
          { value: "new", label: f.modeNew },
        ]}
      />

      {mode === "existing" ? (
        picked ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <input type="hidden" name="productId" value={picked.id} />
            <SpoolRing fraction={1} color={picked.colorHex} size={40} thickness={5} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {picked.productLine} {picked.colorName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {productMeta(picked)}
              </p>
            </div>
            <Button type="button" variant="outline" className="h-10" onClick={() => setPicked(null)}>
              {f.change}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label={f.search} htmlFor="product-search" hint={f.searchHint} error={errors["productId"]}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="product-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={f.searchPlaceholder}
                  className={`${inputClass} pl-9`}
                  autoComplete="off"
                />
              </div>
            </Field>
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground">{f.searchEmpty}</p>
            )}
            {results.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(product);
                        onPick(product);
                      }}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/60"
                    >
                      <span className="size-5 shrink-0 rounded-full border" style={{ backgroundColor: product.colorHex }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {product.productLine} {product.colorName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {productMeta(product)}
                        </span>
                      </span>
                      <Check className="size-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={f.brandName} htmlFor="brandName" error={errors["product.brandName"]}>
            <Input id="brandName" name="product.brandName" placeholder={f.brandPlaceholder} className={inputClass} />
          </Field>
          <Field label={f.productLine} htmlFor="productLine" error={errors["product.productLine"]}>
            <Input id="productLine" name="product.productLine" placeholder={f.productLinePlaceholder} className={inputClass} />
          </Field>
          <Field label={f.material} htmlFor="material" error={errors["product.material"]}>
            <Select id="material" name="product.material" defaultValue="PLA">
              {MATERIALS.map((material) => (
                <option key={material} value={material}>
                  {de.materials[material]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.diameter} htmlFor="diameterUm" error={errors["product.diameterUm"]}>
            <Select id="diameterUm" name="product.diameterUm" defaultValue="1750">
              <option value="1750">1,75 mm</option>
              <option value="2850">2,85 mm</option>
            </Select>
          </Field>
          <Field label={f.colorHex} htmlFor="colorHex" error={errors["product.colorHex"]}>
            <ColorPicker
              id="colorHex"
              name="product.colorHex"
              onPresetPicked={(name) => setColorName((current) => (current.trim() === "" ? name : current))}
            />
          </Field>
          <Field label={f.colorName} htmlFor="colorName" error={errors["product.colorName"]}>
            <Input
              id="colorName"
              name="product.colorName"
              placeholder={f.colorNamePlaceholder}
              value={colorName}
              onChange={(event) => setColorName(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={f.netWeight} htmlFor="netWeightG" error={errors["product.netWeightG"]}>
            <Input id="netWeightG" name="product.netWeightG" inputMode="numeric" defaultValue="1000" className={inputClass} />
          </Field>
          <Field label={f.spoolWeight} htmlFor="spoolWeightG" error={errors["product.spoolWeightG"]}>
            <Input id="spoolWeightG" name="product.spoolWeightG" inputMode="numeric" className={inputClass} />
          </Field>
        </div>
      )}
    </Tile>
  );
}

"use client";

import { PRINT_STATUSES, parseGrams, type PrintStatus } from "@spoolworks/core";
import { Plus, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { DatePicker } from "@/components/form/date-picker";
import { Field, Select, inputClass } from "@/components/form/field";
import { Segmented } from "@/components/segmented";
import { SpoolRing } from "@/components/spool-ring";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { errorText } from "@/lib/error-text";
import type { SpoolView } from "@/lib/queries/spools";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const p = de.prints;

type Row = { key: number; spoolId: string; grams: string };

export type PrintFormDefaults = {
  name?: string;
  status?: PrintStatus;
  printedOn?: string;
  printerId?: string;
  duration?: string;
  modelUrl?: string;
  notes?: string;
  usages?: { spoolId: string; grams: number }[];
};

export function PrintForm({
  mode,
  action,
  cancelHref,
  spools,
  printers,
  defaults = {},
}: {
  mode: "create" | "edit";
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  cancelHref: string;
  spools: SpoolView[];
  printers: { id: string; name: string; loadedSpoolIds: string[] }[];
  defaults?: PrintFormDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const [status, setStatus] = useState<PrintStatus>(defaults.status ?? "PRINTED");
  const [printerId, setPrinterId] = useState(defaults.printerId ?? (mode === "create" ? (printers[0]?.id ?? "") : ""));

  const loadedFor = (id: string) => printers.find((printer) => printer.id === id)?.loadedSpoolIds ?? [];
  const [rows, setRows] = useState<Row[]>(() => {
    if (defaults.usages && defaults.usages.length > 0) {
      return defaults.usages.map((usage, i) => ({ key: i, spoolId: usage.spoolId, grams: String(usage.grams) }));
    }
    // New print: one row per loaded slot of the chosen printer, grams still empty.
    const loaded = mode === "create" ? loadedFor(printerId) : [];
    return loaded.length > 0
      ? loaded.map((spoolId, i) => ({ key: i, spoolId, grams: "" }))
      : [{ key: 0, spoolId: "", grams: "" }];
  });
  const [nextKey, setNextKey] = useState(rows.length);

  const byId = new Map(spools.map((spool) => [spool.id, spool]));
  const total = rows.reduce((sum, row) => sum + (row.spoolId ? (parseGrams(row.grams) ?? 0) : 0), 0);

  function update(key: number, change: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }
  function addRow(spoolId = "") {
    setRows((current) => [...current, { key: nextKey, spoolId, grams: "" }]);
    setNextKey((key) => key + 1);
  }
  function prefillFromPrinter() {
    const loaded = loadedFor(printerId).filter((id) => !rows.some((row) => row.spoolId === id));
    if (loaded.length === 0) return;
    setRows((current) => [
      ...current.filter((row) => row.spoolId !== "" || row.grams !== ""),
      ...loaded.map((spoolId, i) => ({ key: nextKey + i, spoolId, grams: "" })),
    ]);
    setNextKey((key) => key + loaded.length);
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-6">
      <Tile className="space-y-4 md:p-6">
        <Field label={p.name} htmlFor="name" error={errors["name"]}>
          <Input
            id="name"
            name="name"
            placeholder={p.namePlaceholder}
            defaultValue={defaults.name}
            className={inputClass}
            required
          />
        </Field>
        <Field label={p.statusLabel} htmlFor="status" hint={p.statusHint[status]} error={errors["status"]}>
          <input type="hidden" id="status" name="status" value={status} />
          <Segmented
            label={p.statusLabel}
            value={status}
            onChange={setStatus}
            options={PRINT_STATUSES.map((value) => ({ value, label: p.status[value] }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={p.printedOn} htmlFor="printedOn" error={errors["printedOn"]}>
            <DatePicker id="printedOn" name="printedOn" defaultValue={defaults.printedOn} />
          </Field>
          <Field label={p.duration} htmlFor="durationMin" hint={p.durationHint} error={errors["durationMin"]}>
            <Input
              id="durationMin"
              name="durationMin"
              inputMode="numeric"
              placeholder={p.durationPlaceholder}
              defaultValue={defaults.duration}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label={p.printer} htmlFor="printerId" error={errors["printerId"]}>
          <Select id="printerId" name="printerId" value={printerId} onChange={(event) => setPrinterId(event.target.value)}>
            <option value="">{p.printerNone}</option>
            {printers.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={p.modelUrl} htmlFor="modelUrl" error={errors["modelUrl"]}>
          <Input
            id="modelUrl"
            name="modelUrl"
            type="url"
            inputMode="url"
            placeholder="https://makerworld.com/…"
            defaultValue={defaults.modelUrl}
            className={inputClass}
          />
        </Field>
        <Field label={p.notes} htmlFor="notes" error={errors["notes"]}>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
        </Field>
      </Tile>

      <Tile className="space-y-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{p.usageSection}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.usageHint}</p>
          </div>
          <p className="figure shrink-0 text-lg">{p.totalShort(total)}</p>
        </div>

        {spools.length === 0 ? (
          <p className="text-sm text-muted-foreground">{p.usageNone}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <UsageRow
                key={row.key}
                index={index}
                row={row}
                spools={spools}
                selected={byId.get(row.spoolId)}
                taken={rows.filter((other) => other.key !== row.key).map((other) => other.spoolId)}
                error={errors[`usages.${index}.spoolId`] ?? errors[`usages.${index}.grams`]}
                onChange={(change) => update(row.key, change)}
                onRemove={() => setRows((current) => current.filter((other) => other.key !== row.key))}
              />
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => addRow()} disabled={spools.length === 0}>
            <Plus aria-hidden="true" />
            {p.usageAdd}
          </Button>
          {printerId && loadedFor(printerId).length > 0 && (
            <Button type="button" variant="outline" className="h-11" onClick={prefillFromPrinter}>
              <Wand2 aria-hidden="true" />
              {p.printerPrefill}
            </Button>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {errorText(state.error)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-11">
            <Link href={cancelHref}>{p.cancel}</Link>
          </Button>
          <Button type="submit" className="h-11 px-5" disabled={pending}>
            {pending ? p.pending : mode === "create" ? p.create : p.save}
          </Button>
        </div>
      </Tile>
    </form>
  );
}

function UsageRow({
  index,
  row,
  spools,
  selected,
  taken,
  error,
  onChange,
  onRemove,
}: {
  index: number;
  row: Row;
  spools: SpoolView[];
  selected: SpoolView | undefined;
  taken: string[];
  error?: string;
  onChange: (change: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const message = errorText(error);
  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2">
        <SpoolRing
          fraction={selected?.fraction ?? 0}
          color={selected?.colorHex}
          size={32}
          thickness={4}
          label={selected ? `${selected.productLine} ${selected.colorName}` : p.usageSpoolPick}
        />
        <label htmlFor={`${id}-spool`} className="sr-only">
          {p.usageSpool}
        </label>
        <Select
          id={`${id}-spool`}
          name={`usages.${index}.spoolId`}
          value={row.spoolId}
          onChange={(event) => onChange({ spoolId: event.target.value })}
          className={cn("min-w-0 flex-1", !row.spoolId && "text-muted-foreground")}
        >
          <option value="">{p.usageSpoolPick}</option>
          {spools.map((spool) => (
            <option key={spool.id} value={spool.id} disabled={taken.includes(spool.id)}>
              {spool.productLine} {spool.colorName} · {spool.brand} · {spool.remainingG} g
              {spool.status === "ARCHIVED" ? ` (${p.archivedSpool})` : ""}
            </option>
          ))}
        </Select>
        <label htmlFor={`${id}-grams`} className="sr-only">
          {p.usageGrams}
        </label>
        <div className="relative w-24 shrink-0">
          <Input
            id={`${id}-grams`}
            name={`usages.${index}.grams`}
            inputMode="numeric"
            value={row.grams}
            onChange={(event) => onChange({ grams: event.target.value })}
            placeholder="0"
            className={`${inputClass} pr-7 text-right`}
            aria-invalid={Boolean(error)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            g
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="size-11 shrink-0 text-muted-foreground"
          aria-label={p.usageRemove}
          title={p.usageRemove}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {message && (
        <p className="pl-10 text-xs text-destructive" role="alert">
          {message}
        </p>
      )}
    </li>
  );
}

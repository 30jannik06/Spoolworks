"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/form/field";
import { Segmented } from "@/components/segmented";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { errorText } from "@/lib/error-text";
import { de } from "@/messages/de";

const p = de.printers;

type FirstUnit = "4" | "1" | "0";

export function PrinterForm({
  mode,
  action,
  cancelHref,
  defaults = {},
}: {
  mode: "create" | "edit";
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  cancelHref: string;
  defaults?: { name?: string; model?: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [firstUnit, setFirstUnit] = useState<FirstUnit>("4");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-xl">
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
        <Field label={p.model} htmlFor="model" error={errors["model"]}>
          <Input
            id="model"
            name="model"
            placeholder={p.modelPlaceholder}
            defaultValue={defaults.model}
            className={inputClass}
          />
        </Field>
        {mode === "create" && (
          <Field
            label={p.firstUnit}
            htmlFor="firstUnit"
            hint={firstUnit === "1" ? p.unitKindHint : p.firstUnitHint}
            error={errors["firstUnit"]}
          >
            <input type="hidden" id="firstUnit" name="firstUnit" value={firstUnit} />
            <Segmented
              label={p.firstUnit}
              value={firstUnit}
              onChange={setFirstUnit}
              options={[
                { value: "4", label: p.unitKind["4"] },
                { value: "1", label: p.unitKind["1"] },
                { value: "0", label: p.unitKind["0"] },
              ]}
            />
          </Field>
        )}

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {errorText(state.error)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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

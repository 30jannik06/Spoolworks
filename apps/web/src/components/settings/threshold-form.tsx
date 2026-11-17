"use client";

import { useActionState } from "react";

import { updateThreshold } from "@/app/settings/actions";
import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import { de } from "@/messages/de";

export function ThresholdForm({ current }: { current: number }) {
  const [state, formAction, pending] = useActionState(updateThreshold, initialActionState);
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field
        label={de.settings.thresholdLabel}
        htmlFor="lowStockThresholdG"
        error={state.fieldErrors?.["lowStockThresholdG"]}
        className="flex-1"
      >
        <Input
          id="lowStockThresholdG"
          name="lowStockThresholdG"
          inputMode="numeric"
          defaultValue={current}
          className={inputClass}
        />
      </Field>
      <Button type="submit" className="h-11 px-5" disabled={pending}>
        {de.settings.save}
      </Button>
      {state.ok && (
        <p className="text-sm text-success sm:pb-3" role="status">
          {de.settings.saved}
        </p>
      )}
    </form>
  );
}

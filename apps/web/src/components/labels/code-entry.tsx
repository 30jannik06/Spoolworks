"use client";

import { useState } from "react";

import { openSpoolCode } from "@/app/s/actions";
import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/lib/use-form-action";
import { de } from "@/messages/de";

/** Code from the label, typed by hand. Hyphens, spaces and I/L/O mix-ups are forgiven. */
export function CodeEntry() {
  const { state, pending, onSubmit } = useFormAction(openSpoolCode);
  const [code, setCode] = useState("");
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={de.labels.codeLabel} htmlFor="code" hint={de.labels.codeHint} error={state.fieldErrors?.["code"]}>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="K7M2-Q9XA"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${inputClass} figure tracking-widest uppercase`}
          required
        />
      </Field>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? de.labels.codePending : de.labels.codeOpen}
      </Button>
    </form>
  );
}

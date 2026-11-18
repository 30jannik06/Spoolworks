"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { createResetLink } from "@/app/admin/actions";
import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/lib/use-form-action";
import { de } from "@/messages/de";

const s = de.admin;
const subscribeNever = () => () => {};

/**
 * Admin form: email in, one-time reset link out. The link uses the origin this
 * page is open on, because the token only exists in this deployment's database.
 */
export function ResetLinkForm() {
  const { state, pending, onSubmit } = useFormAction(createResetLink);
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const link = state.ok && state.text ? `${origin}${state.text}` : null;

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedFor(link);
    } catch {
      setCopiedFor(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field label={s.email} htmlFor="email" error={state.fieldErrors?.["email"]} className="flex-1">
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="off" className={inputClass} />
        </Field>
        <Button type="submit" className="h-11 px-5 sm:mt-6" disabled={pending}>
          {pending ? de.auth.pending : s.submit}
        </Button>
      </form>
      {link && (
        <div className="space-y-2">
          <label htmlFor="reset-link" className="text-sm font-medium">
            {s.linkLabel}
          </label>
          <Input
            id="reset-link"
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="figure h-11 text-base md:text-sm"
          />
          <Button type="button" variant="outline" className="h-11" onClick={copy}>
            {copiedFor === link ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copiedFor === link ? s.copied : s.copy}
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";

import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { de } from "@/messages/de";

const a = de.auth;

/**
 * Asks Better Auth to mail a reset link. The answer is the same whether an
 * account exists or not, so the form cannot be used to probe addresses.
 */
export function ForgotForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/auth/reset" });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="text-sm">
        {a.forgotSent}
      </p>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm">{a.forgotMailBody}</p>
      <Field label={a.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? a.pending : a.forgotSubmit}
      </Button>
    </form>
  );
}

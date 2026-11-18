"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { de } from "@/messages/de";

const a = de.auth;

/** Redeems a reset link made on /admin. All sessions of the account end. */
export function ResetForm() {
  const token = useSearchParams().get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const differs = newPassword !== String(data.get("newPasswordRepeat") ?? "");
    setError(null);
    setMismatch(differs);
    if (differs) return;

    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {a.resetMissingToken}
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm">
          {a.resetDone}
        </p>
        <Button asChild className="h-11 w-full text-base">
          <Link href="/auth/login">{a.loginSubmit}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <Field label={de.settings.newPassword} htmlFor="newPassword" hint={a.passwordHint}>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </Field>
      <Field
        label={de.settings.newPasswordRepeat}
        htmlFor="newPasswordRepeat"
        error={mismatch ? "passwords_differ" : undefined}
      >
        <Input
          id="newPasswordRepeat"
          name="newPasswordRepeat"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
        {pending ? a.pending : a.resetSubmit}
      </Button>
    </form>
  );
}

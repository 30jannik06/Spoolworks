"use client";

import { useState, type FormEvent } from "react";

import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signedInAuthErrorMessage } from "@/lib/auth-errors";
import { de } from "@/messages/de";

const s = de.settings;

/** Change the password; other devices are signed out. Inputs are cleared only on success. */
export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    setError(null);
    setDone(false);
    const differs = newPassword !== String(data.get("newPasswordRepeat") ?? "");
    setMismatch(differs);
    if (differs) return;

    setPending(true);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (error) {
      setError(signedInAuthErrorMessage(error));
      return;
    }
    form.reset();
    setDone(true);
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      <Field label={s.currentPassword} htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      <Field label={s.newPassword} htmlFor="newPassword" hint={de.auth.passwordHint}>
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
        label={s.newPasswordRepeat}
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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 px-5" disabled={pending}>
          {pending ? de.auth.pending : s.passwordSubmit}
        </Button>
        {done && (
          <p className="text-sm text-success" role="status">
            {s.passwordChanged}
          </p>
        )}
      </div>
    </form>
  );
}

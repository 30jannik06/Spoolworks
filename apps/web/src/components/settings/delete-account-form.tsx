"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signedInAuthErrorMessage } from "@/lib/auth-errors";
import { de } from "@/messages/de";

const s = de.settings;

/**
 * Deletes the account after the password and an explicit tick. Better Auth
 * removes sessions and the user; the database cascades to the workshop and
 * all its data. Afterwards the landing page is loaded fresh.
 */
export function DeleteAccountForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    const confirmed = data.get("confirm") === "on";
    setUnconfirmed(!confirmed);
    if (!confirmed) return;

    setPending(true);
    const { error } = await authClient.deleteUser({ password: String(data.get("password") ?? "") });
    if (error) {
      setPending(false);
      setError(signedInAuthErrorMessage(error));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="confirm" className="size-5 accent-destructive" />
        {s.deleteConfirm}
      </label>
      {unconfirmed && (
        <p role="alert" className="text-xs text-destructive">
          {de.errors.confirm_delete}
        </p>
      )}
      <Field label={s.deletePassword} htmlFor="deletePassword">
        <Input
          id="deletePassword"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="destructive" className="h-11 px-5" disabled={pending}>
        {pending ? de.auth.pending : s.deleteSubmit}
      </Button>
    </form>
  );
}

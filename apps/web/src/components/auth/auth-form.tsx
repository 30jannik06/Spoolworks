"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { signIn, signUp } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";
import { de } from "@/messages/de";

type Mode = "login" | "register";

/**
 * Email + password form for both sign-in and sign-up. Errors are shown inline;
 * a failed login is an expected outcome, not an exception.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = safeNext(searchParams.get("next"));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error } =
      mode === "login"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: String(form.get("name") ?? "") });

    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    router.push(next ?? "/");
    router.refresh();
  }

  const otherHref =
    (mode === "login" ? "/auth/register" : "/auth/login") +
    (next ? `?next=${encodeURIComponent(next)}` : "");

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name">{de.auth.name}</Label>
          <Input id="name" name="name" autoComplete="name" required className="h-11 text-base" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">{de.auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{de.auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
          className="h-11 text-base"
        />
        {mode === "register" ? (
          <p className="text-sm text-muted-foreground">{de.auth.passwordHint}</p>
        ) : (
          <Link
            href="/auth/forgot"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {de.auth.forgotLink}
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending
          ? de.auth.pending
          : mode === "login"
            ? de.auth.loginSubmit
            : de.auth.registerSubmit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? de.auth.noAccount : de.auth.haveAccount}{" "}
        <Link
          href={otherHref}
          className="inline-flex min-h-11 items-center font-medium text-foreground underline"
        >
          {mode === "login" ? de.nav.signUp : de.nav.signIn}
        </Link>
      </p>
    </form>
  );
}

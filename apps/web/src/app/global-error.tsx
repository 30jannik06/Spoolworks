"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/errors/error-screen";
import { de } from "@/messages/de";

import "./globals.css";

const e = de.errorPage;

/**
 * Last resort when the root layout itself fails. It replaces the whole
 * document, so next-themes is not there: apply the stored or system theme
 * by hand. Plain <a> because the router may be what broke.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    let theme: string | null = null;
    try {
      theme = localStorage.getItem("theme");
    } catch {}
    const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <html lang="de">
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <title>{e.errorTitle}</title>
        <ErrorScreen code={e.errorCode} title={e.errorTitle} body={e.errorBody} detail={digest ? e.errorId(digest) : undefined}>
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {e.retry}
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose: the client router may be what failed */}
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium">
            {e.home}
          </a>
        </ErrorScreen>
      </body>
    </html>
  );
}

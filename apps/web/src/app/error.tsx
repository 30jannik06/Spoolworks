"use client";

import Link from "next/link";

import { ErrorScreen } from "@/components/errors/error-screen";
import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

const e = de.errorPage;

/** Errors below the root layout: the frame stays, this replaces the page. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <ErrorScreen code={e.errorCode} title={e.errorTitle} body={e.errorBody} detail={digest ? e.errorId(digest) : undefined}>
      <Button type="button" className="h-11" onClick={() => retry()}>
        {e.retry}
      </Button>
      <Button asChild variant="outline" className="h-11">
        <Link href="/">{e.home}</Link>
      </Button>
    </ErrorScreen>
  );
}

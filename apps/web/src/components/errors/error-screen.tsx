import type { ReactNode } from "react";

import { SpoolMark } from "@/components/layout/spool-mark";
import { Eyebrow } from "@/components/tile";

/**
 * Shared body of the 404, error and global error pages: small code label,
 * one sentence of what happened, and a way out. No hooks, so client error
 * boundaries can render it too.
 */
export function ErrorScreen({
  code,
  title,
  body,
  detail,
  children,
}: {
  code: string;
  title: string;
  body: string;
  /** Small print, e.g. the error id for support. */
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-5 px-4 py-16 md:py-24">
      <SpoolMark className="size-10" />
      <div className="space-y-2">
        <Eyebrow>{code}</Eyebrow>
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">{children}</div>
      {detail && <p className="figure text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

"use client";

import { ChevronRight, PackagePlus, ReceiptText, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { de } from "@/messages/de";

type Action = {
  label: string;
  hint: string;
  icon: typeof Scale;
  /** Target page, or the phase that brings it. */
  href?: string;
  phase?: number;
};

const ACTIONS: Action[] = [
  { label: de.quickActions.weighSpool, hint: de.quickActions.weighSpoolHint, icon: Scale, href: "/weigh" },
  { label: de.quickActions.addSpool, hint: de.quickActions.addSpoolHint, icon: PackagePlus, href: "/spools/new" },
  { label: de.quickActions.logPrint, hint: de.quickActions.logPrintHint, icon: ReceiptText, phase: 3 },
];

/**
 * Quick actions behind the "+" (mobile) and "Neu" (desktop) buttons. A bottom
 * sheet on phones, a centred dialog on wider screens. The targets arrive with
 * later phases; until then each row says which phase brings it.
 */
export function QuickActions({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={de.nav.quickActions}>
      <button
        type="button"
        aria-label={de.nav.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="absolute inset-x-0 bottom-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div className="mx-auto max-w-2xl rounded-t-xl border border-b-0 bg-popover p-4 pb-5 md:w-full md:max-w-md md:rounded-xl md:border-b">
          <p className="eyebrow mb-3">{de.quickActions.title}</p>
          <ul className="divide-y rounded-xl border">
            {ACTIONS.map(({ label, hint, icon: Icon, href, phase }) => {
              const content = (
                <>
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-card">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                  {href ? (
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <span className="rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {de.quickActions.comingInPhase(phase ?? 0)}
                    </span>
                  )}
                </>
              );
              return (
                <li key={label}>
                  {href ? (
                    <Link
                      href={href}
                      onClick={onClose}
                      className="flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-3 py-2.5 text-muted-foreground">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

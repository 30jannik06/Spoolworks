"use client";

import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SpoolMark } from "@/components/layout/spool-mark";
import { NAV, isActive } from "@/components/layout/nav";
import { QuickActions } from "@/components/layout/quick-actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

/** Desktop navigation (md and up): fixed left column, full height. */
export function Sidebar({ userName, workshopName }: { userName: string; workshopName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {open && <QuickActions onClose={close} />}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-background md:flex">
        <Link href="/" className="flex h-16 items-center gap-2.5 px-5 font-medium tracking-tight">
          <SpoolMark />
          {de.app.name}
        </Link>

        <div className="px-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            {de.nav.new}
          </button>
        </div>

        <nav aria-label={de.app.name} className="mt-4 flex flex-col gap-0.5 px-3">
          <p className="eyebrow px-2 pb-2">{de.nav.workshop}</p>
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{workshopName}</p>
            </div>
            <Link
              href="/settings"
              aria-label={de.nav.settings}
              title={de.nav.settings}
              className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="size-[18px]" aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}

"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { NAV, isActive, type NavItem } from "@/components/layout/nav";
import { QuickActions } from "@/components/layout/quick-actions";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

function TabLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}

/** Mobile-only bottom navigation: four tabs and a raised "+" in the middle. */
export function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const tabs = NAV.filter((item) => !item.desktopOnly);
  const [left, right] = [tabs.slice(0, 2), tabs.slice(2)];

  return (
    <>
      {open && <QuickActions onClose={close} />}
      <nav
        aria-label={de.app.name}
        data-tabbar=""
        className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center px-2">
          {left.map((item) => (
            <TabLink key={item.href} item={item} pathname={pathname} onNavigate={close} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={de.nav.quickActions}
              aria-expanded={open}
              className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95"
            >
              {open ? <X className="size-6" /> : <Plus className="size-6" />}
            </button>
          </div>
          {right.map((item) => (
            <TabLink key={item.href} item={item} pathname={pathname} onNavigate={close} />
          ))}
        </div>
      </nav>
    </>
  );
}

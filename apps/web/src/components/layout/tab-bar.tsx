"use client";

import { Home, Layers, Plus, Printer, Images, Scale, PackagePlus, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

type Tab = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const LEFT: Tab[] = [
  { href: "/", label: de.nav.home, icon: Home },
  { href: "/spools", label: de.nav.spools, icon: Layers },
];
const RIGHT: Tab[] = [
  { href: "/printers", label: de.nav.printers, icon: Printer },
  { href: "/prints", label: de.nav.prints, icon: Images },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ tab, pathname, onNavigate }: { tab: Tab; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, tab.href);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      {tab.label}
    </Link>
  );
}

/**
 * Bottom navigation for signed-in users: four tabs and a raised "+" in the
 * middle that opens the quick actions. Fixed to the bottom on every screen
 * size; content reserves room with the `pb-tabbar` utility.
 */
export function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  // Close the sheet on Escape. Tabs close it themselves when tapped.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && <QuickActions onClose={close} />}
      <nav
        aria-label={de.app.name}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-center px-2">
          {LEFT.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} onNavigate={close} />
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
          {RIGHT.map((tab) => (
            <TabLink key={tab.href} tab={tab} pathname={pathname} onNavigate={close} />
          ))}
        </div>
      </nav>
    </>
  );
}

const ACTIONS = [
  { label: de.quickActions.logPrint, hint: de.quickActions.logPrintHint, icon: ReceiptText, phase: 3 },
  { label: de.quickActions.weighSpool, hint: de.quickActions.weighSpoolHint, icon: Scale, phase: 1 },
  { label: de.quickActions.addSpool, hint: de.quickActions.addSpoolHint, icon: PackagePlus, phase: 1 },
] as const;

/**
 * Bottom sheet with the quick actions. The targets arrive with later phases;
 * until then each row says which phase brings it instead of linking to a 404.
 */
function QuickActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={de.nav.quickActions}>
      <button
        type="button"
        aria-label={de.nav.close}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="absolute inset-x-0 bottom-0 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl rounded-t-xl border border-b-0 bg-popover p-4 pb-5">
          <p className="eyebrow mb-3">{de.quickActions.title}</p>
          <ul className="divide-y rounded-xl border">
            {ACTIONS.map(({ label, hint, icon: Icon, phase }) => (
              <li key={label} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-card">
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <span className="rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {de.quickActions.comingInPhase(phase)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

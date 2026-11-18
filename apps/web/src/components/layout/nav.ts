import { ChartColumn, Home, Images, Layers, Printer, type LucideIcon } from "lucide-react";

import { de } from "@/messages/de";

/** desktopOnly: in the sidebar, not in the mobile tab bar (which stays at four tabs around the "+"). */
export type NavItem = { href: string; label: string; icon: LucideIcon; desktopOnly?: boolean };

/** The main areas, shared by the desktop sidebar and the mobile tab bar. */
export const NAV: readonly NavItem[] = [
  { href: "/", label: de.nav.home, icon: Home },
  { href: "/spools", label: de.nav.spools, icon: Layers },
  { href: "/printers", label: de.nav.printers, icon: Printer },
  { href: "/prints", label: de.nav.prints, icon: Images },
  // On phones the dashboard links here.
  { href: "/stats", label: de.nav.stats, icon: ChartColumn, desktopOnly: true },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

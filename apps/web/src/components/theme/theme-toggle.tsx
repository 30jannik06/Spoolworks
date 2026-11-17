"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { de } from "@/messages/de";

const ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS = { system: Monitor, light: Sun, dark: Moon } satisfies Record<ThemeChoice, unknown>;
const LABELS: Record<ThemeChoice, string> = {
  system: de.theme.system,
  light: de.theme.light,
  dark: de.theme.dark,
};

// The stored theme is only known in the browser; render a neutral icon on the
// server and during hydration so the markup matches.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** Cycles system → light → dark. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const current: ThemeChoice = isClient && ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : "system";
  const Icon = ICONS[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${de.theme.toggle}: ${LABELS[current]}`}
      title={LABELS[current]}
      className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

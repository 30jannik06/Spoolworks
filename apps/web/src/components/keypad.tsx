"use client";

import { Delete } from "lucide-react";

import { de } from "@/messages/de";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/**
 * Big numeric keypad for whole grams, thumb-sized. Keeps at most 5 digits and
 * no leading zeros. The parent owns the value.
 */
export function Keypad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  function press(key: (typeof KEYS)[number]) {
    if (key === "clear") return onChange("");
    if (key === "back") return onChange(value.slice(0, -1));
    if (value.length >= 5) return;
    onChange(value === "0" ? key : value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === "back" ? de.weigh.backspace : key === "clear" ? de.weigh.clearAll : undefined}
          className="flex h-14 items-center justify-center rounded-lg border bg-card text-xl transition-colors hover:bg-accent active:scale-[0.98]"
        >
          {key === "back" ? (
            <Delete className="size-5" aria-hidden="true" />
          ) : key === "clear" ? (
            <span className="text-sm text-muted-foreground">C</span>
          ) : (
            <span className="figure">{key}</span>
          )}
        </button>
      ))}
    </div>
  );
}

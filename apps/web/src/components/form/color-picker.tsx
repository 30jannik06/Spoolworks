"use client";

import { normalizeHexColor } from "@spoolworks/core";
import { Check } from "lucide-react";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

/** Common filament colours as quick picks. Names are German defaults for the colour-name field. */
const PRESETS = [
  { name: "Weiß", hex: "#f4f3ef" },
  { name: "Schwarz", hex: "#1f1f1f" },
  { name: "Grau", hex: "#8a8d91" },
  { name: "Silber", hex: "#c3c6ca" },
  { name: "Rot", hex: "#c8312b" },
  { name: "Orange", hex: "#ee7a2a" },
  { name: "Gelb", hex: "#f2c230" },
  { name: "Grün", hex: "#2f8f4e" },
  { name: "Blau", hex: "#2f5fa8" },
  { name: "Hellblau", hex: "#6cb4e4" },
  { name: "Lila", hex: "#7a4fa3" },
  { name: "Pink", hex: "#e86aa6" },
  { name: "Braun", hex: "#7a5232" },
  { name: "Beige", hex: "#d9c7a3" },
] as const;

/**
 * Colour picker for filament colours (shadcn has none): a popover with preset
 * swatches, a saturation/hue field (react-colorful, ~3 kB) and a hex input.
 * Submits "#rrggbb" through a hidden input.
 */
export function ColorPicker({
  id,
  name,
  defaultValue = "#2f5fa8",
  onPresetPicked,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  /** Called with the preset's name, e.g. to pre-fill an empty colour-name field. */
  onPresetPicked?: (name: string) => void;
}) {
  const [hex, setHex] = useState(defaultValue);
  const [draft, setDraft] = useState(defaultValue);

  function apply(next: string) {
    const normalized = normalizeHexColor(next);
    if (normalized) {
      setHex(normalized);
      setDraft(normalized);
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={hex} />
      <Popover>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-input bg-transparent px-3 text-left outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <span className="size-6 shrink-0 rounded-md border" style={{ backgroundColor: hex }} />
            <span className="figure text-base md:text-sm">{hex}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={16}
          className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3"
        >
          <p className="eyebrow">{de.form.colorPresets}</p>
          <div className="grid grid-cols-7 gap-1.5">
            {PRESETS.map((preset) => {
              const active = preset.hex === hex;
              return (
                <button
                  key={preset.hex}
                  type="button"
                  title={preset.name}
                  aria-label={preset.name}
                  aria-pressed={active}
                  onClick={() => {
                    apply(preset.hex);
                    onPresetPicked?.(preset.name);
                  }}
                  className={cn(
                    // Strong border: black on the dark popover and white on the light one stay visible.
                    "flex aspect-square items-center justify-center rounded-md border border-foreground/25",
                    active && "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                  )}
                  style={{ backgroundColor: preset.hex }}
                >
                  {active && <Check className="size-4 mix-blend-difference text-white" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="[&_.react-colorful]:h-40 [&_.react-colorful]:w-full [&_.react-colorful__hue]:mt-2 [&_.react-colorful__hue]:h-4 [&_.react-colorful__hue]:rounded-md [&_.react-colorful__saturation]:rounded-md">
            <HexColorPicker color={hex} onChange={apply} />
          </div>
          <Input
            aria-label={de.form.colorHex}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              apply(event.target.value);
            }}
            className="figure h-11 text-base md:text-sm"
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

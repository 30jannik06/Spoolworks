"use client";

import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { de as dayPickerDe } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

/** "2026-11-17" ↔ local Date, without UTC shifts. */
function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const display = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * shadcn-style date picker (popover + calendar) that submits "YYYY-MM-DD"
 * through a hidden input, so server actions keep receiving a plain string.
 */
export function DatePicker({
  id,
  name,
  defaultValue,
  disableFuture = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  disableFuture?: boolean;
}) {
  const [date, setDate] = useState<Date | undefined>(() => parseIsoDate(defaultValue));
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={date ? toIsoDate(date) : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="figure truncate">{date ? display.format(date) : de.form.pickDate}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(next) => {
              setDate(next);
              setOpen(false);
            }}
            locale={dayPickerDe}
            disabled={disableFuture ? { after: new Date() } : undefined}
            className="[--cell-size:--spacing(11)]"
          />
        </PopoverContent>
      </Popover>
      {date && (
        <button
          type="button"
          onClick={() => setDate(undefined)}
          aria-label={de.form.clearDate}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

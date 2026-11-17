import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The basic surface of the app: a hairline-bordered tile. Use instead of
 * shadcn's Card for dashboard-style content (figures, small lists).
 */
export function Tile({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card p-4", className)} {...props} />;
}

/** Small spaced uppercase label that sits above a figure or a section. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("eyebrow", className)} {...props} />;
}

/** A large tabular figure with an optional unit, e.g. "8,42 kg". */
export function Figure({
  value,
  unit,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-1.5", className)}>
      <span className="figure text-3xl leading-none font-medium">{value}</span>
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </p>
  );
}

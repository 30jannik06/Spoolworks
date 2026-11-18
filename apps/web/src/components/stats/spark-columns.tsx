import { cn } from "@/lib/utils";

/**
 * Stat-tile trend: tiny columns, earlier months in the de-emphasis grey, the
 * current one in the accent. No axis and no hover; the tile states the value
 * and the full chart lives on /stats.
 */
export function SparkColumns({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={label} className={cn("flex h-12 items-end gap-[2px]", className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "max-w-4 flex-1 rounded-t-[3px]",
            i === values.length - 1 ? "bg-primary" : "bg-chart-5/60",
            v === 0 && "opacity-0",
          )}
          style={{ height: `${Math.max(v > 0 ? 6 : 0, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

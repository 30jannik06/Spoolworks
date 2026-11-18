export type BarItem = {
  key: string;
  label: string;
  value: number;
  /** Filament colour: shown as a dot beside the name, never on the bar or the text. */
  colorHex?: string;
};

/**
 * Ranked horizontal bars, largest first, one hue. Name and value are text, so
 * nothing depends on colour or hover; the bar is the comparison. Bars share
 * one baseline and scale to the largest item.
 */
export function BarList({ items, format, label }: { items: BarItem[]; format: (value: number) => string; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.colorHex && (
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: item.colorHex }}
                />
              )}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="figure shrink-0 text-muted-foreground">{format(item.value)}</span>
          </div>
          <div aria-hidden="true" className="h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";

import type { Material } from "@spoolworks/core";

import type { SpoolFilter } from "@/lib/queries/spools";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

type Facets = {
  brands: { id: string; name: string }[];
  materials: Material[];
  colors: { hex: string; name: string }[];
};

/** Builds /spools?… from the current filter with one change applied. */
function hrefFor(filter: SpoolFilter, change: Partial<SpoolFilter>): string {
  const next = { ...filter, ...change };
  const params = new URLSearchParams();
  if (next.material) params.set("material", next.material);
  if (next.brandId) params.set("brand", next.brandId);
  if (next.colorHex) params.set("color", next.colorHex.slice(1));
  if (next.low) params.set("low", "1");
  if (next.archived) params.set("archived", "1");
  if (next.shelf) params.set("shelf", "1");
  const query = params.toString();
  return query ? `/spools?${query}` : "/spools";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Filter chips. State lives in the URL, so the page stays a server component
 * and a filtered view can be bookmarked.
 */
export function SpoolFilters({ filter, facets }: { filter: SpoolFilter; facets: Facets }) {
  const none = !filter.material && !filter.brandId && !filter.colorHex && !filter.low && !filter.archived && !filter.shelf;

  return (
    <div className="space-y-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Chip href="/spools" active={none}>
          {de.spools.filterAll}
        </Chip>
        <Chip href={hrefFor(filter, { low: !filter.low, archived: false })} active={Boolean(filter.low)}>
          <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
          {de.spools.filterLow}
        </Chip>
        <Chip href={hrefFor(filter, { shelf: !filter.shelf, archived: false })} active={Boolean(filter.shelf)}>
          {de.spools.filterShelf}
        </Chip>
        {facets.materials.map((material) => (
          <Chip
            key={material}
            href={hrefFor(filter, { material: filter.material === material ? undefined : material })}
            active={filter.material === material}
          >
            {de.materials[material]}
          </Chip>
        ))}
        {facets.brands.map((brand) => (
          <Chip
            key={brand.id}
            href={hrefFor(filter, { brandId: filter.brandId === brand.id ? undefined : brand.id })}
            active={filter.brandId === brand.id}
          >
            {brand.name}
          </Chip>
        ))}
        <Chip href={hrefFor(filter, { archived: !filter.archived, low: false, shelf: false })} active={Boolean(filter.archived)}>
          {de.spools.filterArchived}
        </Chip>
      </div>
      {facets.colors.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" aria-label={de.spools.filterColor}>
          {facets.colors.map((color) => {
            const active = filter.colorHex === color.hex;
            return (
              <Link
                key={color.hex}
                href={hrefFor(filter, { colorHex: active ? undefined : color.hex })}
                aria-label={color.name}
                aria-current={active ? "true" : undefined}
                title={color.name}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border",
                  active && "border-foreground",
                )}
              >
                <span className="size-6 rounded-full border" style={{ backgroundColor: color.hex }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

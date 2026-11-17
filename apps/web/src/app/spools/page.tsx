import { Layers, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SpoolCard } from "@/components/spools/spool-card";
import { SpoolFilters } from "@/components/spools/spool-filters";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { getSpoolFacets, listSpools, parseSpoolFilter } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function SpoolsPage({ searchParams }: PageProps<"/spools">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Spools searchParams={searchParams} />
    </Suspense>
  );
}

async function Spools({ searchParams }: { searchParams: PageProps<"/spools">["searchParams"] }) {
  const { workshop } = await requireWorkshop("/spools");
  const filter = parseSpoolFilter(await searchParams);
  const [spools, facets] = await Promise.all([
    listSpools(workshop.id, workshop.lowStockThresholdG, filter),
    getSpoolFacets(workshop.id),
  ]);
  const hasAny = facets.brands.length > 0 || Boolean(filter.archived);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{de.spools.title}</h1>
          <p className="figure mt-1 text-sm text-muted-foreground">{de.spools.count(spools.length)}</p>
        </div>
        <Button asChild className="h-11 px-4">
          <Link href="/spools/new">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">{de.spools.add}</span>
            <span className="sr-only sm:hidden">{de.spools.add}</span>
          </Link>
        </Button>
      </div>

      {hasAny && <SpoolFilters filter={filter} facets={facets} />}

      {spools.length > 0 ? (
        <ul className="grid gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
          {spools.map((spool) => (
            <li key={spool.id}>
              <SpoolCard spool={spool} />
            </li>
          ))}
        </ul>
      ) : hasAny ? (
        <Tile className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{de.spools.emptyFiltered}</p>
          <Button asChild variant="outline" className="mt-4 h-11">
            <Link href="/spools">{de.spools.resetFilter}</Link>
          </Button>
        </Tile>
      ) : (
        <Tile className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border bg-background">
            <Layers className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-medium">{de.spools.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{de.spools.emptyBody}</p>
          <Button asChild className="mt-2 h-11 px-5">
            <Link href="/spools/new">
              <Plus aria-hidden="true" />
              {de.spools.add}
            </Link>
          </Button>
        </Tile>
      )}
    </div>
  );
}

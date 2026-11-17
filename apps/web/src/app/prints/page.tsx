import { Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PrintCard } from "@/components/prints/print-card";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { listPrints } from "@/lib/queries/prints";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

const p = de.prints;

export default function PrintsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Prints />
    </Suspense>
  );
}

async function Prints() {
  const { workshop } = await requireWorkshop("/prints");
  const prints = await listPrints(workshop.id);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{p.title}</h1>
          <p className="figure mt-1 text-sm text-muted-foreground">{p.count(prints.length)}</p>
        </div>
        <Button asChild className="h-11 px-4">
          <Link href="/prints/new">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">{p.add}</span>
            <span className="sr-only sm:hidden">{p.add}</span>
          </Link>
        </Button>
      </div>

      {prints.length === 0 ? (
        <Tile className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border bg-background">
            <ReceiptText className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-medium">{p.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{p.emptyBody}</p>
          <Button asChild className="mt-2 h-11 px-5">
            <Link href="/prints/new">
              <Plus aria-hidden="true" />
              {p.add}
            </Link>
          </Button>
        </Tile>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {prints.map((print) => (
            <li key={print.id}>
              <PrintCard print={print} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

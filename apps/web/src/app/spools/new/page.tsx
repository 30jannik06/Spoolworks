import { Suspense } from "react";

import { createSpool } from "@/app/spools/actions";
import { BackLink } from "@/components/layout/back-link";
import { SpoolForm } from "@/components/spools/spool-form";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function NewSpoolPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <NewSpool />
    </Suspense>
  );
}

async function NewSpool() {
  await requireWorkshop("/spools/new");
  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/spools" label={de.spools.title} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.spoolForm.newTitle}</h1>
      </div>
      <SpoolForm mode="create" action={createSpool} cancelHref="/spools" />
    </div>
  );
}

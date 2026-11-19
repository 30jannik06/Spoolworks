import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogSyncButton } from "@/components/admin/catalog-sync-button";
import { ResetLinkForm } from "@/components/admin/reset-link-form";
import { Tile } from "@/components/tile";
import { catalogSyncByHand, requireAdmin } from "@/lib/admin";
import { de } from "@/messages/de";

export const metadata: Metadata = { robots: { index: false } };

/** The manual catalog sync runs as a server action of this page. */
export const maxDuration = 300;

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Admin />
    </Suspense>
  );
}

/** Only for addresses in ADMIN_EMAILS; everyone else gets the 404 page. */
async function Admin() {
  await requireAdmin("/admin");
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{de.admin.title}</h1>
      <Tile className="space-y-4 md:p-6">
        <div>
          <h2 className="font-medium">{de.admin.resetTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.admin.resetBody}</p>
        </div>
        <ResetLinkForm />
      </Tile>
      {catalogSyncByHand() && (
        <Tile className="space-y-4 md:p-6">
          <div>
            <h2 className="font-medium">{de.admin.syncTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{de.admin.syncBody}</p>
          </div>
          <CatalogSyncButton />
        </Tile>
      )}
    </div>
  );
}

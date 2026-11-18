import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetLinkForm } from "@/components/admin/reset-link-form";
import { Tile } from "@/components/tile";
import { requireAdmin } from "@/lib/admin";
import { de } from "@/messages/de";

export const metadata: Metadata = { robots: { index: false } };

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
    </div>
  );
}

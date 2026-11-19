import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetForm } from "@/components/auth/reset-form";
import { Tile } from "@/components/tile";
import { de } from "@/messages/de";

export const metadata: Metadata = { title: de.auth.resetTitle, robots: { index: false } };

export default function ResetPage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-5 px-4 py-12 md:py-20">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">{de.auth.resetTitle}</h1>
        <p className="text-sm text-muted-foreground">{de.auth.resetSubtitle}</p>
      </div>
      <Tile className="p-5">
        {/* useSearchParams() reads the request, so it needs a boundary. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">{de.common.loading}</p>}>
          <ResetForm />
        </Suspense>
      </Tile>
    </div>
  );
}

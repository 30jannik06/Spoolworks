"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { syncCatalogNow, type CatalogSyncResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-text";
import { de } from "@/messages/de";

/** Starts the catalog sync by hand (previews and local only) and shows its report. */
export function CatalogSyncButton() {
  const [result, setResult] = useState<CatalogSyncResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="h-11"
        disabled={pending}
        onClick={() => {
          setResult(null);
          startTransition(async () => setResult(await syncCatalogNow()));
        }}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
        {pending ? de.admin.syncRunning : de.admin.syncButton}
      </Button>
      {result && (
        <p className={result.ok ? "text-sm" : "text-sm text-destructive"} role={result.ok ? "status" : "alert"}>
          {result.ok ? de.admin.syncDone(result.report) : errorText(result.error)}
        </p>
      )}
    </div>
  );
}

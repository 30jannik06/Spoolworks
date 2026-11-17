import { Suspense } from "react";

import { ThresholdForm } from "@/components/settings/threshold-form";
import { Tile } from "@/components/tile";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { workshop } = await requireWorkshop("/settings");
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{de.settings.title}</h1>
      <Tile className="space-y-4 md:p-6">
        <div>
          <h2 className="font-medium">{de.settings.thresholdTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.settings.thresholdBody}</p>
        </div>
        <ThresholdForm current={workshop.lowStockThresholdG} />
      </Tile>
    </div>
  );
}

import { Suspense } from "react";

import { Dashboard } from "@/components/home/dashboard";
import { Landing } from "@/components/home/landing";
import { listPrinters } from "@/lib/queries/printers";
import { getPrintStats } from "@/lib/queries/prints";
import { getWorkshopStats } from "@/lib/queries/stats";
import { getStockStats } from "@/lib/queries/spools";
import { getSession, getWorkshopForUser } from "@/lib/session";
import { de } from "@/messages/de";

/** "/" is the landing page for guests and the workshop dashboard when signed in. */
export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">{de.common.loading}</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const session = await getSession();
  if (!session) {
    return <Landing />;
  }
  const workshop = await getWorkshopForUser(session.user.id);
  const [stock, printers, prints, stats] = await Promise.all([
    getStockStats(workshop.id, workshop.lowStockThresholdG),
    listPrinters(workshop.id, workshop.lowStockThresholdG),
    getPrintStats(workshop.id),
    getWorkshopStats(workshop.id, "6m"),
  ]);
  return (
    <Dashboard
      userName={session.user.name}
      workshopName={workshop.name}
      lowStockThresholdG={workshop.lowStockThresholdG}
      stock={stock}
      printer={printers[0] ?? null}
      prints={prints}
      stats={stats}
    />
  );
}

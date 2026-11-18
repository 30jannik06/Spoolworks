import "server-only";

import { computeStats, type StatsPrint, type StatsRange, type StatsSpool, type WorkshopStats } from "@spoolworks/core";
import { prisma } from "@spoolworks/database";

/**
 * Loads what the statistics need for one workshop and hands it to the pure
 * computeStats(). A household has hundreds of prints, not millions, so one
 * read of all rows is simpler than SQL aggregation and keeps the rules in
 * packages/core. Uncached: reads the session's data, render inside <Suspense>.
 */
export async function getWorkshopStats(workshopId: string, range: StatsRange, now = new Date()): Promise<WorkshopStats> {
  const [prints, spools] = await Promise.all([
    prisma.print.findMany({
      where: { workshopId, status: { not: "PLANNED" } },
      select: {
        id: true,
        status: true,
        printedOn: true,
        createdAt: true,
        durationMin: true,
        printer: { select: { name: true } },
        usages: {
          select: {
            grams: true,
            spool: {
              select: {
                purchasePriceCents: true,
                product: {
                  select: {
                    netWeightG: true,
                    material: true,
                    colorName: true,
                    colorHex: true,
                    brand: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.spool.findMany({
      where: { workshopId },
      select: {
        status: true,
        purchasedOn: true,
        createdAt: true,
        purchasePriceCents: true,
        remainingG: true,
        product: { select: { netWeightG: true } },
      },
    }),
  ]);

  const statsPrints: StatsPrint[] = prints.map((p) => ({
    id: p.id,
    status: p.status,
    date: p.printedOn ?? p.createdAt,
    durationMin: p.durationMin,
    printerName: p.printer?.name ?? null,
    usages: p.usages.map((u) => ({
      grams: u.grams,
      priceCents: u.spool.purchasePriceCents,
      netWeightG: u.spool.product.netWeightG,
      material: u.spool.product.material,
      brand: u.spool.product.brand.name,
      colorName: u.spool.product.colorName,
      colorHex: u.spool.product.colorHex,
    })),
  }));
  const statsSpools: StatsSpool[] = spools.map((s) => ({
    status: s.status,
    boughtOn: s.purchasedOn ?? s.createdAt,
    priceCents: s.purchasePriceCents,
    remainingG: s.remainingG,
    netWeightG: s.product.netWeightG,
  }));

  return computeStats({ prints: statsPrints, spools: statsSpools }, range, now);
}

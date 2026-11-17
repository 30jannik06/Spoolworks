import "server-only";

import { computeRemaining, type LedgerKind } from "@spoolworks/core";
import type { Prisma } from "@spoolworks/database";

type Tx = Prisma.TransactionClient;

/**
 * Locks the spool row for the rest of the transaction, so two weighings (or a
 * weighing and a print) on the same spool cannot interleave their recompute.
 */
export async function lockSpool(tx: Tx, spoolId: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM "Spool" WHERE id = ${spoolId} FOR UPDATE`;
}

/** Recomputes the remaining weight from the ledger and writes the cache column. */
export async function recomputeRemaining(tx: Tx, spoolId: string): Promise<number> {
  const entries = await tx.spoolLedgerEntry.findMany({
    where: { spoolId },
    select: { seq: true, kind: true, valueG: true, active: true },
    orderBy: { seq: "asc" },
  });
  const remainingG = computeRemaining(entries);
  await tx.spool.update({ where: { id: spoolId }, data: { remainingG } });
  return remainingG;
}

/** Appends an anchor (initial, weighing, correction) and refreshes the cache. */
export async function appendAnchor(
  tx: Tx,
  spoolId: string,
  kind: Exclude<LedgerKind, "PRINT">,
  valueG: number,
): Promise<number> {
  await lockSpool(tx, spoolId);
  await tx.spoolLedgerEntry.create({ data: { spoolId, kind, valueG } });
  return recomputeRemaining(tx, spoolId);
}

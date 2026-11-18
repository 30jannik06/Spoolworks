"use server";

import {
  consumesFilament,
  generateShareToken,
  modelSourceFromUrl,
  printInput,
  type PrintInput,
  type PrintStatus,
} from "@spoolworks/core";
import { prisma, type Prisma } from "@spoolworks/database";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { requireWorkshop } from "@/lib/session";
import { lockSpool, recomputeRemaining } from "@/lib/spool-ledger";

type Tx = Prisma.TransactionClient;
type Usage = { spoolId: string; grams: number };

/**
 * Prints and the grams they took from spools. Every change runs in one
 * transaction that also keeps the spool ledgers right:
 *
 * - A usage's PRINT ledger entry exists only while the print consumes filament
 *   (printed or failed). Planned prints have none, so marking one printed later
 *   books it after any weighing in between.
 * - Edits update the existing entry in place. It keeps its sequence number, so
 *   a print booked before a weighing stays "already seen by the scale".
 * - All affected spools are locked in id order, then recomputed.
 */

class ActionFailure extends Error {
  constructor(readonly key: string) {
    super(key);
  }
}

/** Spools the caller may book on this print: active ones, plus any it already uses (even if archived since). */
async function checkSpools(tx: Tx, workshopId: string, spoolIds: string[], alreadyUsed: Set<string>) {
  if (spoolIds.length === 0) return;
  const spools = await tx.spool.findMany({
    where: { id: { in: spoolIds }, workshopId },
    select: { id: true, status: true },
  });
  const byId = new Map(spools.map((spool) => [spool.id, spool]));
  for (const id of spoolIds) {
    const spool = byId.get(id);
    if (!spool) throw new ActionFailure("not_found");
    if (spool.status !== "ACTIVE" && !alreadyUsed.has(id)) throw new ActionFailure("spool_not_active");
  }
}

async function checkPrinter(tx: Tx, workshopId: string, printerId: string | undefined) {
  if (!printerId) return null;
  const printer = await tx.printer.findFirst({ where: { id: printerId, workshopId }, select: { id: true } });
  if (!printer) throw new ActionFailure("printer_not_found");
  return printer.id;
}

/** Brings usages and their ledger entries in line with `desired`, then recomputes every affected spool. */
async function syncUsages(tx: Tx, printId: string, status: PrintStatus, desired: Usage[]) {
  const existing = await tx.printUsage.findMany({
    where: { printId },
    select: { id: true, spoolId: true, ledgerEntry: { select: { seq: true } } },
  });
  const affected = [...new Set([...existing.map((u) => u.spoolId), ...desired.map((u) => u.spoolId)])].sort();
  for (const spoolId of affected) await lockSpool(tx, spoolId);

  const consumes = consumesFilament(status);
  const wanted = new Map(desired.map((usage) => [usage.spoolId, usage.grams]));

  for (const usage of existing) {
    const grams = wanted.get(usage.spoolId);
    if (grams === undefined) {
      await tx.printUsage.delete({ where: { id: usage.id } }); // cascades to its ledger entry
      continue;
    }
    wanted.delete(usage.spoolId);
    await tx.printUsage.update({ where: { id: usage.id }, data: { grams } });
    if (consumes && usage.ledgerEntry) {
      await tx.spoolLedgerEntry.update({ where: { seq: usage.ledgerEntry.seq }, data: { valueG: grams, active: true } });
    } else if (consumes) {
      await tx.spoolLedgerEntry.create({
        data: { spoolId: usage.spoolId, kind: "PRINT", valueG: grams, usageId: usage.id },
      });
    } else if (usage.ledgerEntry) {
      await tx.spoolLedgerEntry.delete({ where: { seq: usage.ledgerEntry.seq } });
    }
  }

  for (const [spoolId, grams] of wanted) {
    const usage = await tx.printUsage.create({ data: { printId, spoolId, grams } });
    if (consumes) {
      await tx.spoolLedgerEntry.create({ data: { spoolId, kind: "PRINT", valueG: grams, usageId: usage.id } });
    }
  }

  for (const spoolId of affected) await recomputeRemaining(tx, spoolId);
}

function printData(input: PrintInput, printerId: string | null) {
  return {
    name: input.name,
    status: input.status,
    printedOn: input.printedOn ? new Date(`${input.printedOn}T00:00:00Z`) : null,
    printerId,
    durationMin: input.durationMin ?? null,
    modelUrl: input.modelUrl ?? null,
    modelSource: input.modelUrl ? modelSourceFromUrl(input.modelUrl) : null,
    notes: input.notes ?? null,
  };
}

function parse(formData: FormData) {
  return printInput.safeParse(formToObject(formData));
}

export async function createPrint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop("/prints/new");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  let printId: string;
  try {
    printId = await prisma.$transaction(async (tx) => {
      const printerId = await checkPrinter(tx, workshop.id, input.printerId);
      await checkSpools(tx, workshop.id, input.usages.map((u) => u.spoolId), new Set());
      const print = await tx.print.create({ data: { workshopId: workshop.id, ...printData(input, printerId) } });
      await syncUsages(tx, print.id, input.status, input.usages);
      return print.id;
    });
  } catch (error) {
    if (error instanceof ActionFailure) return { ok: false, error: error.key };
    throw error;
  }
  redirect(`/prints/${printId}`);
}

export async function updatePrint(printId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop(`/prints/${printId}/edit`);
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const print = await tx.print.findFirst({
        where: { id: printId, workshopId: workshop.id },
        select: { id: true, usages: { select: { spoolId: true } } },
      });
      if (!print) throw new ActionFailure("print_not_found");
      const printerId = await checkPrinter(tx, workshop.id, input.printerId);
      await checkSpools(
        tx,
        workshop.id,
        input.usages.map((u) => u.spoolId),
        new Set(print.usages.map((u) => u.spoolId)),
      );
      await tx.print.update({ where: { id: print.id }, data: printData(input, printerId) });
      await syncUsages(tx, print.id, input.status, input.usages);
    });
  } catch (error) {
    if (error instanceof ActionFailure) return { ok: false, error: error.key };
    throw error;
  }
  redirect(`/prints/${printId}`);
}

/** Deleting a print gives its grams back (unless a later weighing already counted them). */
export async function deletePrint(printId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const deleted = await prisma.$transaction(async (tx) => {
    const print = await tx.print.findFirst({
      where: { id: printId, workshopId: workshop.id },
      select: { id: true, usages: { select: { spoolId: true } } },
    });
    if (!print) return false;
    const spoolIds = [...new Set(print.usages.map((u) => u.spoolId))].sort();
    for (const spoolId of spoolIds) await lockSpool(tx, spoolId);
    await tx.print.delete({ where: { id: print.id } }); // usages and their ledger entries cascade
    for (const spoolId of spoolIds) await recomputeRemaining(tx, spoolId);
    return true;
  });
  if (!deleted) return { ok: false, error: "print_not_found" };
  redirect("/prints");
}

/**
 * Starts or stops sharing a print. Sharing mints a fresh secret token; stopping
 * clears it, so the old link is dead at once and sharing again gives a new one.
 */
export async function setPrintShared(printId: string, shared: boolean): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const where = { id: printId, workshopId: workshop.id };
  // Sharing an already shared print keeps its link (a double click must not kill it).
  const { count } = shared
    ? await prisma.print.updateMany({ where: { ...where, shareToken: null }, data: { shareToken: generateShareToken() } })
    : await prisma.print.updateMany({ where, data: { shareToken: null } });
  if (count === 0 && !(shared && (await prisma.print.count({ where })) > 0)) {
    return { ok: false, error: "print_not_found" };
  }
  refresh();
  return { ok: true };
}

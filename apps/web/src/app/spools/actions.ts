"use server";

import {
  barcodeCandidates,
  brandKey,
  correctionInput,
  createSpoolInput,
  generateShortCode,
  netFromGross,
  spoolDetailsInput,
  weighInput,
} from "@spoolworks/core";
import { prisma, type Prisma } from "@spoolworks/database";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formToObject, type ActionState } from "@/lib/action-state";
import { findProductsByBarcode, searchProducts as searchCatalog, type ProductOption } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { appendAnchor } from "@/lib/spool-ledger";

/**
 * Every action resolves the caller's workshop itself and scopes every lookup
 * by it. A spool from another workshop is indistinguishable from a missing one.
 */

async function uniqueShortCode(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateShortCode();
    const taken = await tx.spool.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("Could not find a free short code");
}

export async function createSpool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workshop } = await requireWorkshop("/spools/new");
  const raw = formToObject(formData);
  // The form always sends the product fields; only one mode counts.
  if (raw["mode"] === "existing") delete raw["product"];
  else delete raw["productId"];

  const parsed = createSpoolInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;

  const spoolId = await prisma.$transaction(async (tx) => {
    let productId = input.productId;
    if (productId) {
      const exists = await tx.filamentProduct.findUnique({ where: { id: productId }, select: { id: true } });
      if (!exists) return null;
    } else if (input.product) {
      const product = input.product;
      const key = brandKey(product.brandName);
      const brand = await tx.brand.upsert({
        where: { nameKey: key },
        update: {},
        create: { name: product.brandName, nameKey: key },
      });
      // Same product typed twice reuses the catalog entry; it is never overwritten.
      const created = await tx.filamentProduct.upsert({
        where: {
          brandId_productLine_material_colorName_diameterUm_netWeightG: {
            brandId: brand.id,
            productLine: product.productLine,
            material: product.material,
            colorName: product.colorName,
            diameterUm: product.diameterUm,
            netWeightG: product.netWeightG,
          },
        },
        update: {},
        create: {
          brandId: brand.id,
          productLine: product.productLine,
          material: product.material,
          colorName: product.colorName,
          colorHex: product.colorHex,
          diameterUm: product.diameterUm,
          netWeightG: product.netWeightG,
          spoolWeightG: product.spoolWeightG ?? null,
          createdById: user.id,
        },
      });
      productId = created.id;
    }
    if (!productId) return null;

    const spool = await tx.spool.create({
      data: {
        workshopId: workshop.id,
        productId,
        shortCode: await uniqueShortCode(tx),
        emptySpoolWeightG: input.emptySpoolWeightG,
        remainingG: input.initialNetG,
        purchasePriceCents: input.purchasePriceCents ?? null,
        purchasedOn: input.purchasedOn ? new Date(`${input.purchasedOn}T00:00:00Z`) : null,
        purchaseUrl: input.purchaseUrl ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
      },
    });
    await appendAnchor(tx, spool.id, "INITIAL", input.initialNetG);
    return spool.id;
  });

  if (!spoolId) {
    return { ok: false, error: "product_not_found", fieldErrors: { productId: "product_not_found" } };
  }
  redirect(`/spools/${spoolId}`);
}

export async function updateSpool(spoolId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop(`/spools/${spoolId}/edit`);
  const parsed = spoolDetailsInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;
  const result = await prisma.spool.updateMany({
    where: { id: spoolId, workshopId: workshop.id },
    data: {
      emptySpoolWeightG: input.emptySpoolWeightG,
      purchasePriceCents: input.purchasePriceCents ?? null,
      purchasedOn: input.purchasedOn ? new Date(`${input.purchasedOn}T00:00:00Z`) : null,
      purchaseUrl: input.purchaseUrl ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };
  redirect(`/spools/${spoolId}`);
}

/** Weighing: gross on the scale minus the spool's empty weight becomes a new anchor. */
export async function weighSpool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const parsed = weighInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { spoolId, grossG } = parsed.data;

  const remainingG = await prisma.$transaction(async (tx) => {
    const spool = await tx.spool.findFirst({
      where: { id: spoolId, workshopId: workshop.id },
      select: { id: true, emptySpoolWeightG: true },
    });
    if (!spool) return null;
    return appendAnchor(tx, spool.id, "WEIGHING", netFromGross(grossG, spool.emptySpoolWeightG));
  });
  if (remainingG === null) return { ok: false, error: "not_found" };

  refresh();
  return { ok: true, value: remainingG };
}

/** Sets the remaining net weight by hand. */
export async function correctSpool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const parsed = correctionInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { spoolId, netG } = parsed.data;

  const remainingG = await prisma.$transaction(async (tx) => {
    const spool = await tx.spool.findFirst({ where: { id: spoolId, workshopId: workshop.id }, select: { id: true } });
    if (!spool) return null;
    return appendAnchor(tx, spool.id, "CORRECTION", netG);
  });
  if (remainingG === null) return { ok: false, error: "not_found" };

  refresh();
  return { ok: true, value: remainingG };
}

export async function setSpoolArchived(spoolId: string, archived: boolean): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const count = await prisma.$transaction(async (tx) => {
    const result = await tx.spool.updateMany({
      where: { id: spoolId, workshopId: workshop.id },
      data: { status: archived ? "ARCHIVED" : "ACTIVE" },
    });
    // An archived spool is used up or put away: it cannot stay loaded in an AMS slot.
    if (result.count > 0 && archived) {
      await tx.amsSlot.updateMany({ where: { spoolId }, data: { spoolId: null } });
    }
    return result.count;
  });
  if (count === 0) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}

/**
 * Deleting removes the spool and its ledger. Used for mistakes; archive for
 * used-up spools. A spool that prints refer to cannot be deleted (the prints
 * would lose their history), only archived.
 */
export async function deleteSpool(spoolId: string): Promise<ActionState> {
  const { workshop } = await requireWorkshop();
  const spool = await prisma.spool.findFirst({
    where: { id: spoolId, workshopId: workshop.id },
    select: { id: true, _count: { select: { usages: true } } },
  });
  if (!spool) return { ok: false, error: "not_found" };
  if (spool._count.usages > 0) return { ok: false, error: "spool_has_prints" };
  await prisma.spool.delete({ where: { id: spool.id } });
  redirect("/spools");
}

/**
 * Catalog lookup for the picker. Signed-in only; the catalog itself holds no
 * personal data. A query that is a barcode (scanned, typed or from a USB
 * scanner) looks up the stored codes; anything else searches by name.
 */
export async function findProducts(query: string): Promise<ProductOption[]> {
  await requireWorkshop();
  if (query.trim().length < 2) return [];
  const codes = barcodeCandidates(query);
  if (codes.length > 0) return findProductsByBarcode(codes);
  return searchCatalog(query);
}

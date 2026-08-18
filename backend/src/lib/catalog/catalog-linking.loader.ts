import type { PrismaClient } from "@prisma/client";
import { buildCatalogBusinessKey } from "./business-key";
import { createCatalogMatchingService } from "./catalog-matching.service";
import { createCatalogLinkingService } from "./catalog-linking.service";
import {
  newCarInventoryRowToListing,
  vehicleRowToListing,
} from "./listing-mapper";
import type { CatalogLinkReport } from "./linking-types";
import type { CatalogApprovalReport, ListingApprovalContext } from "./approval-types";
import type { CatalogVariantRecord } from "./types";
import { createCatalogApprovalService } from "./catalog-approval.service";

export async function loadCatalogVariantRecords(prisma: PrismaClient): Promise<CatalogVariantRecord[]> {
  const rows = await prisma.catalogVariant.findMany({
    include: {
      model: {
        include: {
          brand: true,
        },
      },
    },
  });

  return rows.map((v) => ({
    id: v.id,
    segment: v.model.segment,
    brandSlug: v.model.brand.slug,
    brandName: v.model.brand.name,
    modelSlug: v.model.slug,
    modelName: v.model.name,
    variantSlug: v.slug,
    variantName: v.name,
    fuelType: v.fuelType,
    transmission: v.transmission,
    modelYear: v.modelYear,
    businessKey: v.businessKey,
  }));
}

export async function loadListingRecords(prisma: PrismaClient) {
  const [vehicles, inventory] = await Promise.all([
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        brand: true,
        model: true,
        variant: true,
        fuelType: true,
        transmission: true,
        year: true,
        category: true,
      },
    }),
    prisma.newCarInventory.findMany({
      select: {
        id: true,
        brand: true,
        model: true,
        variant: true,
        fuelType: true,
        transmission: true,
        year: true,
      },
    }),
  ]);

  return [
    ...vehicles.map(vehicleRowToListing),
    ...inventory.map(newCarInventoryRowToListing),
  ];
}

/** Read-only dry run against live DB listings + catalog index. */
export async function runCatalogLinkingDryRun(prisma: PrismaClient): Promise<CatalogLinkReport> {
  const [variants, listings] = await Promise.all([
    loadCatalogVariantRecords(prisma),
    loadListingRecords(prisma),
  ]);

  const matcher = createCatalogMatchingService(variants);
  const linker = createCatalogLinkingService(matcher);
  return linker.buildReport(listings);
}

export async function loadListingApprovalContext(prisma: PrismaClient): Promise<ListingApprovalContext[]> {
  const [vehicles, inventory, dealers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        dealerId: true,
        city: true,
        fuelType: true,
        transmission: true,
      },
    }),
    prisma.newCarInventory.findMany({
      select: {
        id: true,
        dealerId: true,
        fuelType: true,
        transmission: true,
      },
    }),
    prisma.dealer.findMany({
      select: { id: true, name: true },
    }),
  ]);

  const dealerNameById = new Map(dealers.map((d) => [d.id, d.name]));

  return [
    ...vehicles.map((v) => ({
      listingId: v.id,
      dealerId: v.dealerId,
      dealerName: v.dealerId ? (dealerNameById.get(v.dealerId) ?? null) : null,
      city: v.city,
      fuel: v.fuelType,
      transmission: v.transmission,
    })),
    ...inventory.map((i) => ({
      listingId: i.id,
      dealerId: i.dealerId,
      dealerName: dealerNameById.get(i.dealerId) ?? null,
      city: null,
      fuel: i.fuelType,
      transmission: i.transmission,
    })),
  ];
}

/** Phase 2D — linking dry run + approval review (read-only). */
export async function runCatalogApprovalDryRun(prisma: PrismaClient): Promise<CatalogApprovalReport> {
  const [variants, listings, context] = await Promise.all([
    loadCatalogVariantRecords(prisma),
    loadListingRecords(prisma),
    loadListingApprovalContext(prisma),
  ]);

  const matcher = createCatalogMatchingService(variants);
  const linker = createCatalogLinkingService(matcher);
  const linkReport = linker.buildReport(listings);
  const approval = createCatalogApprovalService(variants);
  return approval.review({ linkReport, listingContext: context });
}

/** Build in-memory catalog records for tests (no DB). */
export function catalogVariantRecordFromParts(
  partial: Omit<CatalogVariantRecord, "businessKey"> & { businessKey?: string },
): CatalogVariantRecord {
  const businessKey =
    partial.businessKey ??
    buildCatalogBusinessKey({
      segment: partial.segment,
      brandSlug: partial.brandSlug,
      modelSlug: partial.modelSlug,
      variantSlug: partial.variantSlug,
      fuelType: partial.fuelType,
      transmission: partial.transmission,
      modelYear: partial.modelYear,
    });
  return { ...partial, businessKey };
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCatalogMatchingService } from "@/lib/catalog/catalog-matching.service";
import { loadCatalogVariantRecords } from "@/lib/catalog/catalog-linking.loader";
import { hasOrganizationPermission, type OrganizationPermission } from "@/lib/organization/permissions";
import { organizationForDealer, requireDealerContext, writeAudit } from "@/lib/sales-os/access";
import { isAdminRole, type SalesActor } from "@/lib/sales-os/http";
import { toSnakeRow } from "@/lib/db/table-map";
import { LOW_STOCK_THRESHOLD } from "@/lib/dealer-inventory/constants";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import { parseInventorySpreadsheet } from "@/lib/dealer-inventory/parse-spreadsheet";
import {
  stripClientOwnedInventoryFields,
  validateInventoryInput,
  type InventoryInput,
} from "@/lib/dealer-inventory/validate";

type ImportMode = "create_only" | "create_update";

type PreviewRow = {
  rowNumber: number;
  action: "create" | "update" | "skip" | "error";
  severity: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
  input?: InventoryInput;
  existingId?: string;
  catalogVariantId?: string | null;
  catalogMatchMethod?: string;
  catalogStatus?: string;
};

const pendingImports = new Map<
  string,
  {
    dealerId: string;
    actorUserId: string;
    mode: ImportMode;
    rows: PreviewRow[];
    filename: string;
    createdAt: number;
  }
>();

function metaOf(row: { metadata: unknown }): Record<string, unknown> {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? { ...(row.metadata as Record<string, unknown>) }
    : {};
}

async function assertInventoryPermission(
  actor: SalesActor,
  dealerId: string,
  permission: OrganizationPermission,
) {
  if (isAdminRole(actor.role)) return;
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!dealer) throw new DealerInventoryError("Dealer not found", 404, "DEALER_NOT_FOUND");
  if (dealer.ownerId === actor.userId) return;

  const member = await prisma.dealerMember.findFirst({
    where: { dealerId, userId: actor.userId, isActive: true },
  });
  if (member) return;

  const org = await prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
    include: { members: { where: { userId: actor.userId, status: "active" } } },
  });
  const orgMember = org?.members[0];
  if (!orgMember) throw new DealerInventoryError("Inventory not found", 404, "NOT_FOUND");
  const ok = hasOrganizationPermission(
    orgMember.role,
    permission,
    Array.isArray(orgMember.permissions) ? (orgMember.permissions as string[]) : [],
  );
  if (!ok) throw new DealerInventoryError("Forbidden", 403, "FORBIDDEN");
}

async function assertBranchBelongs(dealerId: string, branchId: string | null | undefined, branchName: string | null | undefined) {
  if (!branchId && !branchName) return { branchId: null as string | null, branchName: null as string | null };
  const org = await organizationForDealer(dealerId);
  if (!org) {
    if (branchId || branchName) {
      throw new DealerInventoryError("Branch does not belong to your organization", 400, "UNAUTHORIZED_BRANCH");
    }
    return { branchId: null, branchName: null };
  }
  if (branchId) {
    const b = await prisma.organizationBranch.findFirst({
      where: { id: branchId, organizationId: org.id, isActive: true },
    });
    if (!b) throw new DealerInventoryError("Branch does not belong to your organization", 400, "UNAUTHORIZED_BRANCH");
    return { branchId: b.id, branchName: b.name };
  }
  const b = await prisma.organizationBranch.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      name: { equals: String(branchName), mode: "insensitive" },
    },
  });
  if (!b) throw new DealerInventoryError("Branch does not belong to your organization", 400, "UNAUTHORIZED_BRANCH");
  return { branchId: b.id, branchName: b.name };
}

async function resolveCatalogVariantId(input: InventoryInput): Promise<{
  catalogVariantId: string | null;
  method: string;
  catalogStatus: "mapped" | "unmapped" | "catalog_empty";
}> {
  const variants = await loadCatalogVariantRecords(prisma);
  if (!variants.length) {
    return { catalogVariantId: null, method: "catalog_empty", catalogStatus: "catalog_empty" };
  }
  try {
    const matcher = createCatalogMatchingService(variants);
    const hit = matcher.match({
      segment: "car",
      brand: input.brand,
      model: input.model,
      // Matcher expects strings — never invent catalog labels into inventory storage.
      variant: input.variant ?? "",
      fuel: input.fuelType ?? "",
      transmission: input.transmission ?? "",
      modelYear: input.year,
    });
    if (hit.catalogVariantId && hit.method !== "none" && hit.confidence >= 80) {
      return { catalogVariantId: hit.catalogVariantId, method: hit.method, catalogStatus: "mapped" };
    }
    return { catalogVariantId: null, method: hit.method || "none", catalogStatus: "unmapped" };
  } catch {
    return { catalogVariantId: null, method: "match_error", catalogStatus: "unmapped" };
  }
}

function duplicateKey(dealerId: string, catalogVariantId: string | null, input: InventoryInput) {
  const colour = (input.colors?.[0] ?? input.colour ?? "").toLowerCase();
  const ref = (input.internalReference ?? "").toLowerCase();
  return `${dealerId}|${catalogVariantId ?? `${input.brand}|${input.model}|${input.variant}|${input.year}`}|${colour}|${ref}`;
}

async function findDuplicate(dealerId: string, catalogVariantId: string | null, input: InventoryInput) {
  const rows = await prisma.newCarInventory.findMany({
    where: {
      dealerId,
      ...(catalogVariantId ? { catalogVariantId } : { brand: input.brand, model: input.model, variant: input.variant, year: input.year }),
    },
    take: 50,
  });
  const colour = (input.colors?.[0] ?? input.colour ?? "").toLowerCase();
  const ref = (input.internalReference ?? "").toLowerCase();
  return (
    rows.find((r) => {
      const meta = metaOf(r);
      const colors = Array.isArray(r.colors) ? (r.colors as string[]) : [];
      const rowColour = (colors[0] ?? "").toLowerCase();
      const rowRef = String(meta.internal_reference ?? "").toLowerCase();
      const colourMatch = !colour || !rowColour || colour === rowColour;
      const refMatch = !ref || !rowRef || ref === rowRef;
      return colourMatch && refMatch;
    }) ?? null
  );
}

function buildMetadata(input: InventoryInput, existing?: Record<string, unknown>): Prisma.InputJsonValue {
  const base = { ...(existing ?? {}) };
  delete base.dealerId;
  delete base.dealer_id;
  delete base.organizationId;
  delete base.userId;
  delete base.ownerId;
  if (input.branchId) base.branch_id = input.branchId;
  if (input.branchName) base.branch_name = input.branchName;
  if (input.pincode) base.pincode = input.pincode;
  if (input.internalReference) base.internal_reference = input.internalReference;
  if (input.expectedAvailability) base.expected_availability = input.expectedAvailability;
  if (input.notes) base.notes = input.notes;
  if (input.dealerPrice != null) base.dealer_price = input.dealerPrice;
  if (input.priceSourceText) base.price_source_text = input.priceSourceText;
  base.price_on_request = Boolean(input.priceOnRequest);
  if (input.kmDriven) base.km_driven = input.kmDriven;
  if (input.ownership) base.ownership = input.ownership;
  if (input.registrationState) base.registration_state = input.registrationState;
  if (input.bodyType) base.body_type = input.bodyType;
  if (input.waitingPeriodDays) base.waiting_period_days = input.waitingPeriodDays;
  if (input.brochureUrl) base.brochure_url = input.brochureUrl;
  if (input.onRoadPriceText) base.on_road_price_text = input.onRoadPriceText;

  const specifications: Record<string, string> = {
    ...((base.specifications && typeof base.specifications === "object" && !Array.isArray(base.specifications)
      ? (base.specifications as Record<string, string>)
      : {}) as Record<string, string>),
  };
  const fuelIsEv = /electric|\bev\b/i.test(input.fuelType ?? "");
  if (input.engineCc) {
    const eng = input.engineCc.trim();
    const skipCc =
      fuelIsEv || /kwh|kw\b|battery/i.test(eng) || /cc/i.test(eng);
    specifications.engine = skipCc ? eng : `${eng} cc`;
  }
  if (input.mileage) specifications.mileage = input.mileage;
  if (input.rangeKm) {
    const range = /km/i.test(input.rangeKm) ? input.rangeKm : `${input.rangeKm} km`;
    specifications.rangeKm = range;
    // UIs that only show mileage still get EV range
    if (!input.mileage && fuelIsEv) specifications.mileage = range;
  }
  if (input.batteryKwh) {
    const batt = /kwh/i.test(input.batteryKwh) ? input.batteryKwh : `${input.batteryKwh} kWh`;
    specifications.battery = batt;
  }
  if (input.power) specifications.power = input.power;
  if (input.torque) specifications.torque = input.torque;
  if (input.seating) specifications.seating = input.seating;
  if (input.bootSpace) specifications.bootSpace = input.bootSpace;
  if (input.groundClearance) specifications.groundClearance = input.groundClearance;
  if (input.driveType) specifications.driveType = input.driveType;
  if (input.airbags) specifications.airbags = input.airbags;
  if (input.bodyType) specifications.bodyType = input.bodyType;
  if (Object.keys(specifications).length) base.specifications = specifications;

  if (input.featuresText) {
    base.features = input.featuresText
      .split(/[|;,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  base.archived = false;
  return base as Prisma.InputJsonValue;
}

function serialize(row: Record<string, unknown>) {
  return toSnakeRow(row);
}

export async function listDealerInventory(
  actor: SalesActor,
  opts: {
    dealerId?: string | null;
    q?: string;
    brand?: string;
    stockStatus?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const dealer = await requireDealerContext(actor, opts.dealerId);
  await assertInventoryPermission(actor, dealer.id, "inventory.read");

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
  const where: Prisma.NewCarInventoryWhereInput = {
    dealerId: dealer.id,
    ...(opts.brand ? { brand: { contains: opts.brand, mode: "insensitive" } } : {}),
    ...(opts.stockStatus ? { stockStatus: opts.stockStatus } : {}),
    ...(opts.q
      ? {
          OR: [
            { brand: { contains: opts.q, mode: "insensitive" } },
            { model: { contains: opts.q, mode: "insensitive" } },
            { variant: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.newCarInventory.count({ where }),
    prisma.newCarInventory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    dealerId: dealer.id,
    total,
    page,
    pageSize,
    data: rows.map((r) => serialize(r as unknown as Record<string, unknown>)),
    kpis: await inventoryKpis(dealer.id),
  };
}

async function inventoryKpis(dealerId: string) {
  const rows = await prisma.newCarInventory.findMany({
    where: { dealerId },
    select: { stock: true, stockStatus: true, brand: true },
  });
  let available = 0;
  let out = 0;
  let low = 0;
  const byBrand: Record<string, number> = {};
  for (const r of rows) {
    byBrand[r.brand] = (byBrand[r.brand] ?? 0) + 1;
    if (r.stockStatus === "available" && r.stock > 0) available += 1;
    if (r.stockStatus === "out_of_stock" || r.stock === 0) out += 1;
    if (r.stockStatus === "available" && r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD) low += 1;
  }
  return {
    totalRows: rows.length,
    available,
    outOfStock: out,
    lowStock: low,
    byBrand,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}

export async function createDealerInventoryItem(actor: SalesActor, raw: Record<string, unknown>) {
  const clean = stripClientOwnedInventoryFields(raw);
  const claimedDealerId = String(raw.dealer_id ?? raw.dealerId ?? "").trim() || null;
  const dealer = await requireDealerContext(actor, claimedDealerId);
  await assertInventoryPermission(actor, dealer.id, "inventory.create");

  const input = validateInventoryInput(clean);
  const branch = await assertBranchBelongs(dealer.id, input.branchId, input.branchName);
  input.branchId = branch.branchId;
  input.branchName = branch.branchName;

  const catalog = await resolveCatalogVariantId(input);
  const dup = await findDuplicate(dealer.id, catalog.catalogVariantId, input);
  if (dup) {
    throw new DealerInventoryError("Duplicate inventory row exists", 409, "DUPLICATE", { existingId: dup.id });
  }

  const row = await prisma.newCarInventory.create({
    data: {
      dealerId: dealer.id,
      brand: input.brand,
      model: input.model,
      variant: input.variant,
      year: input.year,
      fuelType: input.fuelType,
      transmission: input.transmission,
      exShowroomPrice: input.exShowroomPrice,
      onRoadPrice:
        input.dealerPrice != null && input.dealerPrice > 0
          ? input.dealerPrice
          : input.exShowroomPrice > 0
            ? Math.round(input.exShowroomPrice * 1.12)
            : null,
      price: input.dealerPrice ?? (input.exShowroomPrice > 0 ? input.exShowroomPrice : null),
      discountAmount: input.discountAmount ?? 0,
      stock: input.stock,
      stockStatus: input.stockStatus,
      colors: input.colors ?? [],
      imageUrl: input.imageUrl,
      expectedDeliveryDays: input.expectedDeliveryDays ?? undefined,
      catalogVariantId: catalog.catalogVariantId,
      lastStockUpdateAt: new Date(),
      metadata: buildMetadata(input, {
        catalog_match_method: catalog.method,
        catalog_status: catalog.catalogStatus,
        ...(typeof raw.metadata === "object" && raw.metadata && !Array.isArray(raw.metadata)
          ? (raw.metadata as Record<string, unknown>)
          : {}),
      }),
    },
  });

  await writeAudit(actor, "inventory.create", {
    inventoryId: row.id,
    dealerId: dealer.id,
    catalogVariantId: catalog.catalogVariantId,
  });

  return serialize(row as unknown as Record<string, unknown>);
}

export async function updateDealerInventoryItem(actor: SalesActor, id: string, raw: Record<string, unknown>) {
  const existing = await prisma.newCarInventory.findUnique({ where: { id } });
  if (!existing) throw new DealerInventoryError("Inventory not found", 404, "NOT_FOUND");
  await requireDealerContext(actor, existing.dealerId);
  await assertInventoryPermission(actor, existing.dealerId, "inventory.update");

  const clean = stripClientOwnedInventoryFields(raw);
  const merged = {
    brand: clean.brand ?? existing.brand,
    model: clean.model ?? existing.model,
    variant: clean.variant ?? existing.variant,
    year: clean.year ?? clean.model_year ?? existing.year,
    fuel_type: clean.fuel_type ?? clean.fuelType ?? existing.fuelType,
    transmission: clean.transmission ?? existing.transmission,
    stock: clean.stock ?? existing.stock,
    stock_status: clean.stock_status ?? clean.stockStatus ?? existing.stockStatus,
    ex_showroom_price: clean.ex_showroom_price ?? clean.exShowroomPrice ?? existing.exShowroomPrice,
    dealer_price: clean.dealer_price ?? clean.dealerPrice ?? existing.price,
    discount: clean.discount ?? clean.discount_amount ?? existing.discountAmount,
    colours: clean.colour ?? clean.color,
    colors: clean.colors ?? existing.colors,
    branch_id: clean.branch_id ?? clean.branchId ?? metaOf(existing).branch_id,
    branch: clean.branch ?? clean.branch_name ?? metaOf(existing).branch_name,
    pincode: clean.pincode ?? metaOf(existing).pincode,
    internal_reference: clean.internal_reference ?? metaOf(existing).internal_reference,
    notes: clean.notes ?? metaOf(existing).notes,
    image_url: clean.image_url ?? clean.imageUrl ?? existing.imageUrl,
    expected_delivery_days: clean.expected_delivery_days ?? clean.expectedDeliveryDays ?? existing.expectedDeliveryDays,
  };

  const input = validateInventoryInput(merged as Record<string, unknown>);
  const branch = await assertBranchBelongs(existing.dealerId, input.branchId, input.branchName);
  input.branchId = branch.branchId;
  input.branchName = branch.branchName;

  let catalogVariantId = existing.catalogVariantId;
  if (clean.brand || clean.model || clean.variant || clean.fuel_type || clean.transmission || clean.year) {
    const catalog = await resolveCatalogVariantId(input);
    catalogVariantId = catalog.catalogVariantId;
  }

  const nextMeta = metaOf(existing);
  if (Array.isArray(clean.images)) {
    nextMeta.images = (clean.images as unknown[])
      .map((u) => String(u ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);
  } else if (input.imageUrl) {
    const prev = Array.isArray(nextMeta.images) ? (nextMeta.images as string[]) : [];
    nextMeta.images = [input.imageUrl, ...prev.filter((u) => u !== input.imageUrl)].slice(0, 8);
  }

  const row = await prisma.newCarInventory.update({
    where: { id },
    data: {
      brand: input.brand,
      model: input.model,
      variant: input.variant,
      year: input.year,
      fuelType: input.fuelType,
      transmission: input.transmission,
      exShowroomPrice: input.exShowroomPrice,
      onRoadPrice: input.dealerPrice ?? existing.onRoadPrice,
      price: input.dealerPrice ?? input.exShowroomPrice,
      discountAmount: input.discountAmount ?? 0,
      stock: input.stock,
      stockStatus: input.stockStatus,
      colors: input.colors ?? [],
      imageUrl: input.imageUrl,
      expectedDeliveryDays: input.expectedDeliveryDays ?? undefined,
      catalogVariantId,
      lastStockUpdateAt: new Date(),
      metadata: buildMetadata(input, nextMeta),
    },
  });

  await writeAudit(actor, "inventory.update", { inventoryId: id, dealerId: existing.dealerId });
  return serialize(row as unknown as Record<string, unknown>);
}

export async function updateDealerInventoryStock(actor: SalesActor, id: string, stock: number, stockStatus?: string) {
  const existing = await prisma.newCarInventory.findUnique({ where: { id } });
  if (!existing) throw new DealerInventoryError("Inventory not found", 404, "NOT_FOUND");
  await requireDealerContext(actor, existing.dealerId);
  await assertInventoryPermission(actor, existing.dealerId, "inventory.update");
  if (!Number.isInteger(stock) || stock < 0) {
    throw new DealerInventoryError("Stock must be an integer >= 0", 400, "INVALID_STOCK");
  }
  const status =
    stockStatus ??
    (stock === 0 ? "out_of_stock" : existing.stockStatus === "out_of_stock" ? "available" : existing.stockStatus);
  const row = await prisma.newCarInventory.update({
    where: { id },
    data: {
      stock,
      stockStatus: status,
      lastStockUpdateAt: new Date(),
    },
  });
  await writeAudit(actor, "inventory.stock_update", { inventoryId: id, stock, stockStatus: status });
  return serialize(row as unknown as Record<string, unknown>);
}

export async function archiveDealerInventoryItem(actor: SalesActor, id: string) {
  const existing = await prisma.newCarInventory.findUnique({ where: { id } });
  if (!existing) throw new DealerInventoryError("Inventory not found", 404, "NOT_FOUND");
  await requireDealerContext(actor, existing.dealerId);
  await assertInventoryPermission(actor, existing.dealerId, "inventory.delete");

  const meta = metaOf(existing);
  const linkedVehicleId = typeof meta.vehicle_id === "string" ? meta.vehicle_id : null;

  const linked = await prisma.quotation.count({ where: { inventoryId: id } });
  const td = await prisma.testDriveBooking.count({ where: { inventoryId: id } });
  if (linked > 0 || td > 0) {
    meta.archived = true;
    const row = await prisma.newCarInventory.update({
      where: { id },
      data: {
        stock: 0,
        stockStatus: "out_of_stock",
        metadata: meta as Prisma.InputJsonValue,
        lastStockUpdateAt: new Date(),
      },
    });
    if (linkedVehicleId) {
      await prisma.vehicle
        .updateMany({
          where: { id: linkedVehicleId, deletedAt: null },
          data: { deletedAt: new Date(), status: "sold" },
        })
        .catch(() => undefined);
    }
    await writeAudit(actor, "inventory.archive", { inventoryId: id, soft: true });
    return serialize(row as unknown as Record<string, unknown>);
  }

  await prisma.newCarInventory.delete({ where: { id } });
  if (linkedVehicleId) {
    await prisma.vehicle
      .updateMany({
        where: { id: linkedVehicleId, deletedAt: null },
        data: { deletedAt: new Date(), status: "sold" },
      })
      .catch(() => undefined);
  } else {
    // Fallback: hide matching marketplace row for same dealer + brand/model
    await prisma.vehicle
      .updateMany({
        where: {
          deletedAt: null,
          dealerId: existing.dealerId,
          brand: existing.brand,
          model: existing.model,
          OR: [{ condition: "new" }, { category: "new-cars" }],
        },
        data: { deletedAt: new Date(), status: "sold" },
      })
      .catch(() => undefined);
  }
  await writeAudit(actor, "inventory.archive", { inventoryId: id, soft: false });
  return { id, deleted: true };
}

/** Remove NewCarInventory (+ soft-delete marketplace vehicle) when dealer deletes a vehicle listing. */
export async function purgeInventoryForVehicle(actor: SalesActor, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId },
  });
  if (!vehicle) throw new DealerInventoryError("Vehicle not found", 404, "NOT_FOUND");
  if (vehicle.dealerId) {
    await requireDealerContext(actor, vehicle.dealerId);
    await assertInventoryPermission(actor, vehicle.dealerId, "inventory.delete");
  } else {
    // Private seller listing — only owner/admin; require auth already on route
    if (!isAdminRole(actor.role) && actor.userId !== vehicle.sellerId) {
      throw new DealerInventoryError("Forbidden", 403, "FORBIDDEN");
    }
  }

  await prisma.vehicle.updateMany({
    where: { id: vehicleId, deletedAt: null },
    data: { deletedAt: new Date(), status: "sold" },
  });

  const byMeta = await prisma.newCarInventory.findMany({
    where: { metadata: { path: ["vehicle_id"], equals: vehicleId } },
  });

  // Fallback only when no explicit link — same dealer + brand + model (+ variant)
  let rows = byMeta;
  if (!rows.length && vehicle.dealerId) {
    rows = await prisma.newCarInventory.findMany({
      where: {
        dealerId: vehicle.dealerId,
        brand: vehicle.brand,
        model: vehicle.model,
        ...(vehicle.variant ? { variant: vehicle.variant } : {}),
      },
      take: 5,
    });
  }

  let removed = 0;
  for (const row of rows) {
    const q = await prisma.quotation.count({ where: { inventoryId: row.id } });
    const td = await prisma.testDriveBooking.count({ where: { inventoryId: row.id } });
    if (q > 0 || td > 0) {
      const m = metaOf(row);
      m.archived = true;
      m.vehicle_id = vehicleId;
      await prisma.newCarInventory.update({
        where: { id: row.id },
        data: {
          stock: 0,
          stockStatus: "out_of_stock",
          metadata: m as Prisma.InputJsonValue,
          lastStockUpdateAt: new Date(),
        },
      });
    } else {
      await prisma.newCarInventory.delete({ where: { id: row.id } });
    }
    removed += 1;
  }

  await writeAudit(actor, "inventory.purge_by_vehicle", { vehicleId, removed });
  return { vehicleId, deleted: true, inventoryRemoved: removed };
}

/** After CRM edits a marketplace vehicle, push brand/model/price/image to linked NewCarInventory. */
export async function syncInventoryFromMarketplaceVehicle(
  actor: SalesActor,
  vehicleId: string,
  patch: Record<string, unknown>,
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) throw new DealerInventoryError("Vehicle not found", 404, "NOT_FOUND");
  if (vehicle.dealerId) {
    await requireDealerContext(actor, vehicle.dealerId);
    await assertInventoryPermission(actor, vehicle.dealerId, "inventory.update");
  } else if (!isAdminRole(actor.role) && actor.userId !== vehicle.sellerId) {
    throw new DealerInventoryError("Forbidden", 403, "FORBIDDEN");
  }

  const byMeta = await prisma.newCarInventory.findMany({
    where: { metadata: { path: ["vehicle_id"], equals: vehicleId } },
  });
  let rows = byMeta;
  if (!rows.length && vehicle.dealerId) {
    rows = await prisma.newCarInventory.findMany({
      where: {
        dealerId: vehicle.dealerId,
        brand: vehicle.brand,
        model: vehicle.model,
        ...(vehicle.variant ? { variant: vehicle.variant } : {}),
      },
      take: 5,
    });
  }
  if (!rows.length) {
    return { vehicleId, updated: 0 };
  }

  const imageUrlRaw =
    patch.image_url != null
      ? String(patch.image_url)
      : patch.imageUrl != null
        ? String(patch.imageUrl)
        : Array.isArray(patch.images) && patch.images[0] != null
          ? String(patch.images[0])
          : undefined;
  const imageUrl =
    imageUrlRaw != null && imageUrlRaw.trim()
      ? imageUrlRaw.trim().slice(0, 512)
      : imageUrlRaw === ""
        ? null
        : undefined;

  const brand = patch.brand != null ? String(patch.brand).trim() : undefined;
  const model = patch.model != null ? String(patch.model).trim() : undefined;
  const variant = patch.variant != null ? String(patch.variant).trim() : undefined;
  const fuelType =
    patch.fuel_type != null
      ? String(patch.fuel_type)
      : patch.fuelType != null
        ? String(patch.fuelType)
        : undefined;
  const transmission = patch.transmission != null ? String(patch.transmission) : undefined;
  const exRaw = patch.ex_showroom_price ?? patch.exShowroomPrice ?? patch.price;
  const exShowroomPrice =
    exRaw != null && Number.isFinite(Number(exRaw)) ? Math.max(0, Math.round(Number(exRaw))) : undefined;

  // Also refresh marketplace vehicle flags when CRM marks listing as new
  if (patch.condition === "new" || patch.category === "new-cars") {
    await prisma.vehicle.updateMany({
      where: { id: vehicleId, deletedAt: null },
      data: {
        condition: "new",
        category: "new-cars",
        kmsDriven: 0,
        owners: 0,
      },
    });
  }

  let updated = 0;
  for (const row of rows) {
    const meta = metaOf(row);
    meta.vehicle_id = vehicleId;
    if (Array.isArray(patch.images)) {
      meta.images = (patch.images as unknown[])
        .map((u) => String(u ?? "").trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    await prisma.newCarInventory.update({
      where: { id: row.id },
      data: {
        ...(brand ? { brand } : {}),
        ...(model ? { model } : {}),
        ...(variant ? { variant } : {}),
        ...(fuelType ? { fuelType } : {}),
        ...(transmission ? { transmission } : {}),
        ...(exShowroomPrice != null
          ? {
              exShowroomPrice,
              price: exShowroomPrice > 0 ? exShowroomPrice : row.price,
              ...(exShowroomPrice > 0
                ? { onRoadPrice: Math.round(exShowroomPrice * 1.12) }
                : {}),
            }
          : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        metadata: meta as Prisma.InputJsonValue,
        lastStockUpdateAt: new Date(),
      },
    });
    updated += 1;
  }

  await writeAudit(actor, "inventory.sync_from_vehicle", { vehicleId, updated });
  return { vehicleId, updated };
}

export async function previewDealerInventoryImport(
  actor: SalesActor,
  opts: { filename: string; content: Buffer | Uint8Array | string; mode?: ImportMode; dealerId?: string | null },
) {
  const dealer = await requireDealerContext(actor, opts.dealerId);
  await assertInventoryPermission(actor, dealer.id, "inventory.create");
  const mode: ImportMode = opts.mode === "create_update" ? "create_update" : "create_only";
  const parsed = parseInventorySpreadsheet({ filename: opts.filename, content: opts.content });

  const previewRows: PreviewRow[] = [];
  for (const row of parsed.rows) {
    const errors: string[] = [];
    const rowWarnings: string[] = [];
    let input: InventoryInput | undefined;
    let catalogVariantId: string | null = null;
    let catalogMatchMethod = "";
    let catalogStatus = "";
    let existingId: string | undefined;
    let action: PreviewRow["action"] = "create";
    let severity: PreviewRow["severity"] = "valid";

    try {
      input = validateInventoryInput(row.values);
      rowWarnings.push(...(input.warnings ?? []));
      if (rowWarnings.length) severity = "warning";
      const branch = await assertBranchBelongs(dealer.id, input.branchId, input.branchName);
      input.branchId = branch.branchId;
      input.branchName = branch.branchName;
      const catalog = await resolveCatalogVariantId(input);
      catalogVariantId = catalog.catalogVariantId;
      catalogMatchMethod = catalog.method;
      catalogStatus = catalog.catalogStatus;
      if (catalog.catalogStatus === "unmapped" || catalog.catalogStatus === "catalog_empty") {
        rowWarnings.push(
          "Catalog variant not matched — inventory can still be imported as unmapped (no master catalog invent).",
        );
        severity = "warning";
      }
      const dup = await findDuplicate(dealer.id, catalogVariantId, input);
      if (dup) {
        existingId = dup.id;
        if (mode === "create_only") {
          action = "skip";
        } else {
          action = "update";
        }
      }
    } catch (e) {
      action = "error";
      severity = "error";
      errors.push(e instanceof Error ? e.message : "Invalid row");
    }

    previewRows.push({
      rowNumber: row.rowNumber,
      action,
      severity,
      errors,
      warnings: rowWarnings,
      input,
      existingId,
      catalogVariantId,
      catalogMatchMethod,
      catalogStatus,
    });
  }

  const batchId = crypto.randomUUID();
  pendingImports.set(batchId, {
    dealerId: dealer.id,
    actorUserId: actor.userId,
    mode,
    rows: previewRows,
    filename: opts.filename,
    createdAt: Date.now(),
  });

  // drop stale batches (>1h)
  for (const [k, v] of pendingImports) {
    if (Date.now() - v.createdAt > 60 * 60 * 1000) pendingImports.delete(k);
  }

  const ready = previewRows.filter((r) => r.action === "create" || r.action === "update");
  const readyWithWarnings = ready.filter((r) => r.severity === "warning");
  const readyClean = ready.filter((r) => r.severity === "valid");

  return {
    batchId,
    filename: opts.filename,
    mode,
    warnings: parsed.warnings,
    total: previewRows.length,
    valid: ready.length,
    invalid: previewRows.filter((r) => r.action === "error").length,
    readyToImport: readyClean.length,
    readyWithWarnings: readyWithWarnings.length,
    needCorrection: previewRows.filter((r) => r.action === "error").length,
    toCreate: previewRows.filter((r) => r.action === "create").length,
    toUpdate: previewRows.filter((r) => r.action === "update").length,
    skipped: previewRows.filter((r) => r.action === "skip").length,
    rows: previewRows,
  };
}

export async function confirmDealerInventoryImport(actor: SalesActor, batchId: string) {
  const batch = pendingImports.get(batchId);
  if (!batch) throw new DealerInventoryError("Import batch not found or expired", 404, "BATCH_NOT_FOUND");
  if (batch.actorUserId !== actor.userId && !isAdminRole(actor.role)) {
    throw new DealerInventoryError("Forbidden", 403, "FORBIDDEN");
  }
  await requireDealerContext(actor, batch.dealerId);
  await assertInventoryPermission(actor, batch.dealerId, "inventory.create");

  // idempotency: remove before write so double-click cannot re-run
  pendingImports.delete(batchId);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ rowNumber: number; error: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const row of batch.rows) {
      if (row.action === "skip") {
        skipped += 1;
        continue;
      }
      if (row.action === "error" || !row.input) {
        failed += 1;
        failures.push({ rowNumber: row.rowNumber, error: row.errors.join("; ") || "Invalid" });
        continue;
      }
      try {
        if (row.action === "update" && row.existingId) {
          await tx.newCarInventory.update({
            where: { id: row.existingId },
            data: {
              stock: row.input.stock,
              stockStatus: row.input.stockStatus,
              exShowroomPrice: row.input.exShowroomPrice,
              price: row.input.dealerPrice ?? row.input.exShowroomPrice,
              discountAmount: row.input.discountAmount ?? 0,
              colors: row.input.colors ?? [],
              catalogVariantId: row.catalogVariantId,
              lastStockUpdateAt: new Date(),
              metadata: buildMetadata(row.input),
            },
          });
          updated += 1;
        } else {
          await tx.newCarInventory.create({
            data: {
              dealerId: batch.dealerId,
              brand: row.input.brand,
              model: row.input.model,
              variant: row.input.variant,
              year: row.input.year,
              fuelType: row.input.fuelType,
              transmission: row.input.transmission,
              exShowroomPrice: row.input.exShowroomPrice,
              onRoadPrice:
                row.input.dealerPrice != null && row.input.dealerPrice > 0
                  ? row.input.dealerPrice
                  : row.input.exShowroomPrice > 0
                    ? Math.round(row.input.exShowroomPrice * 1.12)
                    : null,
              price:
                row.input.dealerPrice ?? (row.input.exShowroomPrice > 0 ? row.input.exShowroomPrice : null),
              discountAmount: row.input.discountAmount ?? 0,
              stock: row.input.stock,
              stockStatus: row.input.stockStatus,
              colors: row.input.colors ?? [],
              imageUrl: row.input.imageUrl,
              catalogVariantId: row.catalogVariantId,
              lastStockUpdateAt: new Date(),
              metadata: buildMetadata(row.input, {
                catalog_match_method: row.catalogMatchMethod,
                catalog_status: row.catalogStatus ?? (row.catalogVariantId ? "mapped" : "unmapped"),
              }),
            },
          });
          created += 1;
        }
      } catch (e) {
        failed += 1;
        failures.push({
          rowNumber: row.rowNumber,
          error: e instanceof Error ? e.message : "Write failed",
        });
      }
    }
  });

  await writeAudit(actor, "inventory.bulk_import", {
    dealerId: batch.dealerId,
    filename: batch.filename,
    created,
    updated,
    skipped,
    failed,
    batchId,
  });

  return {
    batchId,
    filename: batch.filename,
    total: batch.rows.length,
    created,
    updated,
    skipped,
    failed,
    failures,
  };
}

/** Public-safe new-car stock discovery (no internal notes / private fields). */
export async function listPublicNewCarStock(opts: {
  brand?: string;
  model?: string;
  pincode?: string;
  q?: string;
  limit?: number;
}) {
  const limit = Math.min(60, Math.max(1, opts.limit ?? 24));
  let dealerIds: string[] | undefined;
  if (opts.pincode && /^\d{6}$/.test(opts.pincode)) {
    const [pinDealers, orgs] = await Promise.all([
      prisma.dealer.findMany({
        where: { deletedAt: null, pincode: opts.pincode },
        select: { id: true },
      }),
      prisma.organization.findMany({
        where: {
          deletedAt: null,
          legacyDealerId: { not: null },
          branches: { some: { postalCode: opts.pincode, isActive: true } },
        },
        select: { legacyDealerId: true },
      }),
    ]);
    dealerIds = [
      ...new Set([...pinDealers.map((d) => d.id), ...orgs.map((o) => o.legacyDealerId!).filter(Boolean)]),
    ];
    if (!dealerIds.length) return [];
  }

  const rows = await prisma.newCarInventory.findMany({
    where: {
      stock: { gt: 0 },
      stockStatus: "available",
      ...(dealerIds ? { dealerId: { in: dealerIds } } : {}),
      ...(opts.brand ? { brand: { contains: opts.brand, mode: "insensitive" } } : {}),
      ...(opts.model ? { model: { contains: opts.model, mode: "insensitive" } } : {}),
      ...(opts.q
        ? {
            OR: [
              { brand: { contains: opts.q, mode: "insensitive" } },
              { model: { contains: opts.q, mode: "insensitive" } },
              { variant: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const dealerMap = new Map(
    (
      await prisma.dealer.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.dealerId))] }, deletedAt: null },
        select: { id: true, name: true, slug: true, city: true, state: true, pincode: true, isVerified: true },
      })
    ).map((d) => [d.id, d]),
  );

  return rows.map((r) => {
    const d = dealerMap.get(r.dealerId);
    const colors = Array.isArray(r.colors) ? (r.colors as string[]) : [];
    const meta = metaOf(r);
    const ex = Number(r.exShowroomPrice);
    const listed = r.price != null ? Number(r.price) : ex;
    const hasRealPrice = Number.isFinite(listed) && listed > 0;
    const priceOnRequest = Boolean(meta.price_on_request) || !hasRealPrice;
    return {
      id: r.id,
      brand: r.brand,
      model: r.model,
      variant: r.variant,
      year: r.year,
      fuel_type: r.fuelType,
      transmission: r.transmission,
      // Never expose fake ₹0 as a genuine customer price
      ex_showroom_price: hasRealPrice ? (ex > 0 ? ex : listed) : null,
      price: hasRealPrice ? listed : null,
      price_on_request: priceOnRequest,
      price_display: priceOnRequest ? "Price on request" : undefined,
      price_source_text: meta.price_source_text ? String(meta.price_source_text) : undefined,
      discount_amount: Number(r.discountAmount),
      stock: r.stock,
      stock_status: r.stockStatus,
      colors,
      image_url: (() => {
        const imgs = Array.isArray(meta.images)
          ? (meta.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
          : [];
        return imgs[0] ?? r.imageUrl;
      })(),
      images: (() => {
        const out: string[] = [];
        const add = (raw: unknown) => {
          const t = String(raw ?? "").trim();
          if (!t) return;
          if (
            !(
              t.startsWith("http://") ||
              t.startsWith("https://") ||
              t.includes("/uploads/") ||
              t.startsWith("/media/")
            )
          ) {
            return;
          }
          if (!out.includes(t)) out.push(t);
        };
        if (Array.isArray(meta.images)) for (const u of meta.images) add(u);
        add(r.imageUrl);
        return out.slice(0, 8);
      })(),
      catalog_variant_id: r.catalogVariantId,
      body_type: meta.body_type ? String(meta.body_type) : undefined,
      on_road_price: r.onRoadPrice != null ? Number(r.onRoadPrice) : null,
      waiting_period_days: meta.waiting_period_days ? String(meta.waiting_period_days) : undefined,
      brochure_url: meta.brochure_url ? String(meta.brochure_url) : undefined,
      specifications:
        meta.specifications && typeof meta.specifications === "object" ? meta.specifications : undefined,
      features: Array.isArray(meta.features) ? meta.features : undefined,
      notes: meta.notes ? String(meta.notes) : undefined,
      dealer: d
        ? {
            id: d.id,
            name: d.name,
            slug: d.slug,
            city: d.city,
            state: d.state,
            pincode: d.pincode,
            is_verified: d.isVerified,
          }
        : null,
    };
  });
}

export function __clearPendingImportsForTests() {
  pendingImports.clear();
}

export function __seedPendingImportForTests(
  batchId: string,
  value: {
    dealerId: string;
    actorUserId: string;
    mode: ImportMode;
    rows: PreviewRow[];
    filename: string;
  },
) {
  pendingImports.set(batchId, { ...value, createdAt: Date.now() });
}

void duplicateKey;

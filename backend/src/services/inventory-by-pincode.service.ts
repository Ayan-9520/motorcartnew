import { prisma } from "@/lib/prisma";
import { isAvailableMarketplaceVehicle, isAvailableNewCarStock } from "@/lib/inventory/availability";
import { isIndiaCompatibleCountry, validateIndiaPincode } from "@/lib/inventory/pin";
import {
  emptyStockByPinResponse,
  safeBranch,
  serializeInventoryItem,
  serializeVehicleItem,
  type PublicDealer,
  type StockByPinItem,
  type StockByPinResponse,
} from "@/lib/inventory/serialize";

type BranchMatch = { id: string; name: string; pincode: string };

async function resolveDealersForPincode(pincode: string): Promise<{
  dealers: Map<string, PublicDealer>;
  branchesByDealer: Map<string, BranchMatch[]>;
}> {
  const [dealerRows, branchRows] = await Promise.all([
    prisma.dealer.findMany({
      where: { pincode, deletedAt: null },
      select: { id: true, name: true, city: true, state: true },
    }),
    prisma.organizationBranch.findMany({
      where: { postalCode: pincode, isActive: true },
      select: {
        id: true,
        name: true,
        postalCode: true,
        country: true,
        organization: {
          select: {
            status: true,
            deletedAt: true,
            legacyDealerId: true,
          },
        },
      },
    }),
  ]);

  const dealers = new Map<string, PublicDealer>();
  for (const row of dealerRows) {
    dealers.set(row.id, row);
  }

  const branchesByDealer = new Map<string, BranchMatch[]>();
  const branchDealerIds = new Set<string>();

  for (const branch of branchRows) {
    if (!isIndiaCompatibleCountry(branch.country)) continue;
    const org = branch.organization;
    if (!org || org.deletedAt || org.status !== "active") continue;
    const dealerId = org.legacyDealerId;
    if (!dealerId) continue;
    branchDealerIds.add(dealerId);
    const list = branchesByDealer.get(dealerId) ?? [];
    list.push({ id: branch.id, name: branch.name, pincode });
    branchesByDealer.set(dealerId, list);
  }

  const missingIds = [...branchDealerIds].filter((id) => !dealers.has(id));
  if (missingIds.length) {
    const extra = await prisma.dealer.findMany({
      where: { id: { in: missingIds }, deletedAt: null },
      select: { id: true, name: true, city: true, state: true },
    });
    for (const row of extra) dealers.set(row.id, row);
  }

  for (const dealerId of [...branchesByDealer.keys()]) {
    if (!dealers.has(dealerId)) branchesByDealer.delete(dealerId);
  }

  return { dealers, branchesByDealer };
}

function branchForDealer(
  branchesByDealer: Map<string, BranchMatch[]>,
  dealerId: string,
): BranchMatch | undefined {
  return safeBranch(branchesByDealer.get(dealerId) ?? []);
}

export async function getInventoryByPincode(rawPincode: unknown): Promise<StockByPinResponse> {
  const pincode = validateIndiaPincode(rawPincode);
  const { dealers, branchesByDealer } = await resolveDealersForPincode(pincode);
  const dealerIds = [...dealers.keys()];
  if (!dealerIds.length) return emptyStockByPinResponse(pincode);

  const [inventoryRows, vehicleRows] = await Promise.all([
    prisma.newCarInventory.findMany({
      where: { dealerId: { in: dealerIds }, stock: { gt: 0 } },
    }),
    prisma.vehicle.findMany({
      where: {
        dealerId: { in: dealerIds },
        status: "available",
        deletedAt: null,
      },
      select: {
        id: true,
        dealerId: true,
        brand: true,
        model: true,
        variant: true,
        year: true,
        title: true,
        slug: true,
        category: true,
        status: true,
        deletedAt: true,
        catalogVariantId: true,
      },
    }),
  ]);

  const items: StockByPinItem[] = [];
  const seenInventory = new Set<string>();
  const seenVehicles = new Set<string>();

  for (const row of inventoryRows) {
    if (seenInventory.has(row.id)) continue;
    if (!isAvailableNewCarStock(row.stock, row.stockStatus)) continue;
    const dealer = dealers.get(row.dealerId);
    if (!dealer) continue;
    seenInventory.add(row.id);
    items.push(
      serializeInventoryItem({
        inventoryId: row.id,
        dealer,
        branch: branchForDealer(branchesByDealer, dealer.id),
        stock: row.stock,
        catalogVariantId: row.catalogVariantId,
        brand: row.brand,
        model: row.model,
        variant: row.variant,
        year: row.year,
      }),
    );
  }

  for (const row of vehicleRows) {
    if (!row.dealerId || seenVehicles.has(row.id)) continue;
    if (!isAvailableMarketplaceVehicle(row.status, row.deletedAt)) continue;
    const dealer = dealers.get(row.dealerId);
    if (!dealer) continue;
    seenVehicles.add(row.id);
    items.push(
      serializeVehicleItem({
        vehicleId: row.id,
        dealer,
        branch: branchForDealer(branchesByDealer, dealer.id),
        catalogVariantId: row.catalogVariantId,
        brand: row.brand,
        model: row.model,
        variant: row.variant,
        year: row.year,
        title: row.title,
        slug: row.slug,
        category: row.category,
      }),
    );
  }

  return { pincode, count: items.length, items };
}

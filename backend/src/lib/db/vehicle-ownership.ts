import { prisma } from "@/lib/prisma";

const MUTATING_ACTIONS = new Set(["update", "upsert", "delete"]);

/** Returns the value of an `id eq X` filter, or null when the query does not target one row. */
export function extractIdEqFilter(filters: unknown): string | null {
  try {
    const parsed = typeof filters === "string" ? JSON.parse(filters) : filters;
    if (!Array.isArray(parsed)) return null;
    const hit = parsed.find(
      (f: { column?: string; op?: string; value?: unknown }) =>
        f?.column === "id" && f?.op === "eq" && typeof f?.value === "string" && f.value.trim() !== "",
    ) as { value: string } | undefined;
    return hit ? hit.value.trim() : null;
  } catch {
    return null;
  }
}

export function isVehicleMutation(table: string, action: string): boolean {
  return table.trim() === "vehicles" && MUTATING_ACTIONS.has(action.trim().toLowerCase());
}

/**
 * Non-admin may update/delete a marketplace vehicle only when they listed it,
 * own its dealer account, or are an active member of that dealer's organization.
 */
export async function canMutateVehicle(userId: string, vehicleId: string): Promise<boolean> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { sellerId: true, dealerId: true, dealer: { select: { ownerId: true } } },
  });
  if (!vehicle) return false;
  if (vehicle.sellerId === userId) return true;
  if (vehicle.dealer?.ownerId === userId) return true;
  if (!vehicle.dealerId) return false;

  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: "active",
      organization: { legacyDealerId: vehicle.dealerId, deletedAt: null },
    },
    select: { id: true },
  });
  return !!member;
}

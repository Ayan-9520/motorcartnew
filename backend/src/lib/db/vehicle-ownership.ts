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

/** True when the user owns the dealer row or is an active member of its organization. */
export async function canActForDealer(userId: string, dealerId: string): Promise<boolean> {
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!dealer) return false;
  if (dealer.ownerId === userId) return true;
  const member = await prisma.organizationMember.findFirst({
    where: { userId, status: "active", organization: { legacyDealerId: dealerId, deletedAt: null } },
    select: { id: true },
  });
  return !!member;
}

/**
 * Non-admin inserts: seller is always the caller, and any dealer_id must be one they can act for.
 * Returns the sanitized body, or null when a row targets someone else's dealer.
 */
export async function sanitizeVehicleInsertBody(userId: string, body: unknown): Promise<unknown | null> {
  const rows = Array.isArray(body) ? body : [body];
  const out: Record<string, unknown>[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") return null;
    const row = { ...(raw as Record<string, unknown>) };
    const dealerId = (row.dealer_id ?? row.dealerId) as string | null | undefined;
    if (dealerId && !(await canActForDealer(userId, String(dealerId)))) return null;
    delete row.sellerId;
    row.seller_id = userId;
    out.push(row);
  }
  return Array.isArray(body) ? out : out[0];
}

/**
 * Vehicle update by a non-admin: `seller_id` cannot be reassigned and `dealer_id` may only
 * point at a showroom the user can act for. Returns null when the dealer is not theirs.
 */
export async function sanitizeVehicleUpdateBody(userId: string, body: unknown): Promise<unknown | null> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const row = { ...(body as Record<string, unknown>) };
  delete row.seller_id;
  delete row.sellerId;
  const hasDealer = "dealer_id" in row || "dealerId" in row;
  if (hasDealer) {
    const dealerId = (row.dealer_id ?? row.dealerId) as string | null | undefined;
    if (dealerId && !(await canActForDealer(userId, String(dealerId)))) return null;
  }
  return row;
}

/** Profile columns a signed-in user may change on their own `users` row. */
const SELF_EDITABLE_USER_COLUMNS = new Set([
  "full_name",
  "fullName",
  "phone",
  "city",
  "state",
  "avatar_url",
  "avatarUrl",
  "company_name",
  "companyName",
  "community_handle",
  "communityHandle",
  "community_bio",
  "communityBio",
  "community_cover_url",
  "communityCoverUrl",
]);

/** Drops role/status/approval/verification and any other non-profile column from a self-update. */
export function sanitizeSelfUserUpdate(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (SELF_EDITABLE_USER_COLUMNS.has(k)) out[k] = v;
  }
  return out;
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
  return canActForDealer(userId, vehicle.dealerId);
}

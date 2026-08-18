/** Named /api/db/query operations — the only way clients request a specific business action. */

import { prisma } from "@/lib/prisma";
import { toSnakeRow } from "@/lib/db/table-map";
import type { NamedQueryOperation, QueryAuth } from "@/lib/db/query-allowlist";
import { getVehicleDetail } from "@/lib/vehicles/vehicle-detail.service";
import { createCustomerEnquiry } from "@/lib/leads/enquiry.service";
import { serializeVehicle } from "@/lib/serialize-vehicle";

export class NamedQueryError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "NamedQueryError";
    this.status = status;
  }
}

export type NamedQueryParams = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_SELECT = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  status: true,
  city: true,
  state: true,
  isVerified: true,
  companyName: true,
  createdAt: true,
  updatedAt: true,
} as const;

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function int(v: unknown, fallback: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : fallback;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

async function vehicleDetail(params: NamedQueryParams) {
  const id = str(params.id) ?? str(params.vehicle_id) ?? str(params.slug);
  if (!id) throw new NamedQueryError("id required", 400);
  const detail = await getVehicleDetail(id);
  if (!detail) throw new NamedQueryError("Not found", 404);
  return detail;
}

async function vehicleSearch(params: NamedQueryParams) {
  const category = str(params.category);
  const brand = str(params.brand);
  const city = str(params.city);
  const q = str(params.q);
  const limit = int(params.limit, 24, 100);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      status: "available",
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
      ...(city ? { city } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      specs: true,
      dealer: { select: { id: true, slug: true, name: true, city: true, phone: true, isVerified: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return vehicles.map((v) => ({
    ...serializeVehicle(v),
    source_type: "marketplace" as const,
  }));
}

async function dealerInventoryLookup(params: NamedQueryParams) {
  const dealerId = str(params.dealer_id) ?? str(params.dealerId);
  if (!dealerId || !UUID_RE.test(dealerId)) {
    throw new NamedQueryError("dealer_id required", 400);
  }

  const rows = await prisma.newCarInventory.findMany({
    where: { dealerId },
    orderBy: { updatedAt: "desc" },
    take: int(params.limit, 50, 100),
  });

  return rows.map((row) => toSnakeRow(row as unknown as Record<string, unknown>));
}

async function createEnquiry(params: NamedQueryParams) {
  const name = str(params.name);
  const phone = str(params.phone);
  if (!name || !phone) throw new NamedQueryError("Name and phone are required", 400);

  const result = await createCustomerEnquiry({
    name,
    phone,
    email: str(params.email),
    source: str(params.source),
    notes: str(params.notes) ?? str(params.message),
    message: str(params.message) ?? str(params.notes),
    vehicle_id: str(params.vehicle_id) ?? str(params.vehicleId),
    vehicle_title: str(params.vehicle_title) ?? str(params.vehicleTitle),
    vehicle_slug: str(params.vehicle_slug) ?? str(params.vehicleSlug),
    dealer_id: str(params.dealer_id) ?? str(params.dealerId),
    dealer_slug: str(params.dealer_slug) ?? str(params.dealerSlug),
    category: str(params.category),
    location: str(params.location),
    preferred_contact: str(params.preferred_contact) ?? str(params.preferredContact),
    consent: params.consent === undefined ? undefined : Boolean(params.consent),
    metadata: typeof params.metadata === "object" && params.metadata && !Array.isArray(params.metadata)
      ? (params.metadata as Record<string, unknown>)
      : undefined,
  });

  return {
    lead: toSnakeRow(result.lead as unknown as Record<string, unknown>),
    assignment: result.assignment,
    duplicate: result.duplicate,
    pipeline_status: result.pipelineStatus,
  };
}

async function customerProfile(auth: QueryAuth, params: NamedQueryParams) {
  if (!auth) throw new NamedQueryError("Unauthorized", 401);

  const action = (str(params.action) ?? "select").toLowerCase();
  if (action !== "select" && action !== "update") {
    throw new NamedQueryError("Unknown operation", 400);
  }

  if (action === "select") {
    const user = await prisma.user.findFirst({
      where: { id: auth.userId, deletedAt: null },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NamedQueryError("Not found", 404);
    return toSnakeRow(user as unknown as Record<string, unknown>);
  }

  const body = (params.body && typeof params.body === "object" && !Array.isArray(params.body)
    ? (params.body as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const data: { fullName?: string; phone?: string; city?: string; state?: string; avatarUrl?: string } = {};
  if (typeof body.full_name === "string" || typeof body.fullName === "string") {
    data.fullName = String(body.full_name ?? body.fullName).trim().slice(0, 120);
  }
  if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 20);
  if (typeof body.city === "string") data.city = body.city.trim().slice(0, 80);
  if (typeof body.state === "string") data.state = body.state.trim().slice(0, 80);
  if (typeof body.avatar_url === "string" || typeof body.avatarUrl === "string") {
    data.avatarUrl = String(body.avatar_url ?? body.avatarUrl).trim().slice(0, 512);
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data,
    select: PROFILE_SELECT,
  });
  return toSnakeRow(user as unknown as Record<string, unknown>);
}

export async function runNamedQuery(
  operation: NamedQueryOperation,
  args: { auth: QueryAuth; params: NamedQueryParams },
): Promise<unknown> {
  switch (operation) {
    case "vehicle_detail":
      return vehicleDetail(args.params);
    case "vehicle_search":
      return vehicleSearch(args.params);
    case "dealer_inventory_lookup":
      return dealerInventoryLookup(args.params);
    case "create_enquiry":
      return createEnquiry(args.params);
    case "customer_profile":
      return customerProfile(args.auth, args.params);
    default:
      throw new NamedQueryError("Unknown operation", 400);
  }
}

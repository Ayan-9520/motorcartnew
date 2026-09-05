import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "@/lib/superapp/errors";
import { normalizeSearchCriteria, type SavedSearchCriteria } from "@/lib/superapp/search-criteria";
import type { SuperActor } from "@/lib/superapp/http";
import { isAdminRole } from "@/lib/superapp/http";

function ownerId(actor: SuperActor, userId?: string) {
  if (isAdminRole(actor.role) && userId) return userId;
  if (userId && userId !== actor.userId) throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  return actor.userId;
}

function vehicleWhere(criteria: SavedSearchCriteria): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { deletedAt: null, status: "available" };
  if (criteria.brand) where.brand = { equals: String(criteria.brand), mode: "insensitive" };
  if (criteria.model) where.model = { equals: String(criteria.model), mode: "insensitive" };
  if (criteria.variant) where.variant = { equals: String(criteria.variant), mode: "insensitive" };
  if (criteria.category) where.category = String(criteria.category);
  if (criteria.condition) where.condition = String(criteria.condition);
  if (criteria.fuel) where.fuelType = { equals: String(criteria.fuel), mode: "insensitive" };
  if (criteria.transmission) where.transmission = { equals: String(criteria.transmission), mode: "insensitive" };
  if (criteria.city) where.city = { equals: String(criteria.city), mode: "insensitive" };
  if (criteria.budgetMin || criteria.budgetMax) {
    where.price = {
      gte: criteria.budgetMin != null ? Number(criteria.budgetMin) : undefined,
      lte: criteria.budgetMax != null ? Number(criteria.budgetMax) : undefined,
    };
  }
  if (criteria.yearMin || criteria.yearMax) {
    where.year = {
      gte: criteria.yearMin != null ? Number(criteria.yearMin) : undefined,
      lte: criteria.yearMax != null ? Number(criteria.yearMax) : undefined,
    };
  }
  if (criteria.kmMax != null) where.kmsDriven = { lte: Number(criteria.kmMax) };
  if (criteria.owners != null) where.owners = Number(criteria.owners);
  if (criteria.pincode) {
    where.dealer = { pincode: String(criteria.pincode) };
  }
  return where;
}

export async function listSavedSearches(actor: SuperActor) {
  return prisma.savedSearch.findMany({ where: { userId: ownerId(actor) }, orderBy: { updatedAt: "desc" } });
}

export async function createSavedSearch(actor: SuperActor, name: string, criteria: Record<string, unknown>, notifyOnMatch = false) {
  const n = name.trim().slice(0, 80);
  if (n.length < 2) throw new SuperAppError("Name is required", 400, "INVALID_NAME");
  return prisma.savedSearch.create({
    data: {
      userId: actor.userId,
      name: n,
      criteria: normalizeSearchCriteria(criteria) as Prisma.InputJsonValue,
      notifyOnMatch,
    },
  });
}

export async function updateSavedSearch(
  actor: SuperActor,
  id: string,
  patch: { name?: string; criteria?: Record<string, unknown>; notifyOnMatch?: boolean },
) {
  const row = await prisma.savedSearch.findUnique({ where: { id } });
  if (!row || row.userId !== actor.userId) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  return prisma.savedSearch.update({
    where: { id },
    data: {
      name: patch.name?.trim().slice(0, 80),
      criteria: patch.criteria ? (normalizeSearchCriteria(patch.criteria) as Prisma.InputJsonValue) : undefined,
      notifyOnMatch: patch.notifyOnMatch,
    },
  });
}

export async function deleteSavedSearch(actor: SuperActor, id: string) {
  const row = await prisma.savedSearch.findUnique({ where: { id } });
  if (!row || row.userId !== actor.userId) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  await prisma.savedSearch.delete({ where: { id } });
  return { deleted: true };
}

export async function runSavedSearch(actor: SuperActor, id: string) {
  const row = await prisma.savedSearch.findUnique({ where: { id } });
  if (!row || row.userId !== actor.userId) throw new SuperAppError("Not found", 404, "NOT_FOUND");
  const criteria = row.criteria as SavedSearchCriteria;
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere(criteria),
    take: 50,
    select: { id: true, title: true, brand: true, model: true, price: true, city: true, year: true },
  });
  await prisma.savedSearch.update({ where: { id }, data: { lastRunAt: new Date() } });
  return { vehicles, count: vehicles.length };
}

/** Scheduler entry point — only notifies on newly seen matching vehicles. */
export async function runSavedSearchNotifications() {
  const searches = await prisma.savedSearch.findMany({ where: { notifyOnMatch: true } });
  let notified = 0;
  for (const search of searches) {
    const vehicles = await prisma.vehicle.findMany({
      where: vehicleWhere(search.criteria as SavedSearchCriteria),
      select: { id: true, title: true },
      take: 20,
    });
    for (const v of vehicles) {
      const seen = await prisma.savedSearchMatch.findFirst({
        where: { savedSearchId: search.id, vehicleId: v.id },
      });
      if (seen) continue;
      await prisma.savedSearchMatch.create({ data: { savedSearchId: search.id, vehicleId: v.id } });
      const existing = await prisma.notification.findFirst({
        where: { userId: search.userId, kind: "saved_search", payload: { path: ["dedupe_key"], equals: `${search.id}:${v.id}` } },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: {
          userId: search.userId,
          title: "New match for saved search",
          body: `${v.title} matches “${search.name}”`,
          message: `${v.title} matches “${search.name}”`,
          kind: "saved_search",
          payload: { dedupe_key: `${search.id}:${v.id}`, vehicleId: v.id } as Prisma.InputJsonValue,
        },
      });
      notified += 1;
    }
  }
  return { notified };
}

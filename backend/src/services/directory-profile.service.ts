import type { CommunityBusinessEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categoryToEntityType } from "@/lib/directory/constants";
import { mapDirectoryBusiness } from "@/lib/directory/map-business";

export type DirectoryListParams = {
  entityType: CommunityBusinessEntityType;
  q?: string;
  city?: string;
  state?: string;
  verified?: boolean;
  limit?: number;
};

export async function listDirectoryBusinesses(params: DirectoryListParams) {
  const where: Prisma.CommunityBusinessProfileWhereInput = {
    entityType: params.entityType,
    ...(params.city ? { city: params.city } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(params.verified ? { isVerified: true } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q } },
            { tagline: { contains: params.q } },
            { city: { contains: params.q } },
          ],
        }
      : {}),
  };

  const rows = await prisma.communityBusinessProfile.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { followerCount: "desc" }, { name: "asc" }],
    take: Math.min(params.limit ?? 50, 100),
  });

  return Promise.all(rows.map((r) => mapDirectoryBusiness(r)));
}

export async function searchDirectory(params: {
  q?: string;
  city?: string;
  state?: string;
  entityType?: CommunityBusinessEntityType;
  verified?: boolean;
  limit?: number;
}) {
  const where: Prisma.CommunityBusinessProfileWhereInput = {
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.city ? { city: params.city } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(params.verified ? { isVerified: true } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q } },
            { tagline: { contains: params.q } },
            { city: { contains: params.q } },
            { state: { contains: params.q } },
          ],
        }
      : {}),
  };

  const rows = await prisma.communityBusinessProfile.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { followerCount: "desc" }],
    take: Math.min(params.limit ?? 40, 80),
  });

  return Promise.all(rows.map((r) => mapDirectoryBusiness(r)));
}

export async function getDirectoryBusinessBySlug(slug: string, viewerId?: string | null) {
  const row = await prisma.communityBusinessProfile.findFirst({ where: { slug } });
  if (!row) return null;
  return mapDirectoryBusiness(row, viewerId);
}

export async function getDirectoryBusinessByCategorySlug(
  category: string,
  slug: string,
  viewerId?: string | null
) {
  const entityType = categoryToEntityType(category);
  if (!entityType) return null;
  const row = await prisma.communityBusinessProfile.findFirst({
    where: { slug, entityType },
  });
  if (!row) return null;
  return mapDirectoryBusiness(row, viewerId);
}

export async function updateDirectoryBusinessMetadata(
  ownerUserId: string,
  slug: string,
  patch: {
    about?: string | null;
    services?: unknown[];
    contact?: Record<string, unknown> | null;
    website?: string | null;
    phone?: string | null;
    social_links?: unknown;
  }
) {
  const row = await prisma.communityBusinessProfile.findFirst({
    where: { slug, ownerUserId },
  });
  if (!row) return null;

  const meta = { ...(row.metadata as Record<string, unknown>) };
  if (patch.about !== undefined) meta.about = patch.about;
  if (patch.services !== undefined) meta.services = patch.services;
  if (patch.contact !== undefined) meta.contact = patch.contact;
  if (patch.social_links !== undefined) meta.social_links = patch.social_links;

  const updated = await prisma.communityBusinessProfile.update({
    where: { id: row.id },
    data: {
      metadata: meta as Prisma.InputJsonValue,
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    },
  });

  return mapDirectoryBusiness(updated, ownerUserId);
}

export async function getDirectoryHubStats() {
  const counts = await prisma.communityBusinessProfile.groupBy({
    by: ["entityType"],
    _count: { id: true },
  });
  return counts.map((c) => ({
    entity_type: c.entityType,
    count: c._count.id,
  }));
}

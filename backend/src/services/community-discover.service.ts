import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProfileType } from "@/lib/community/ownership";
import { mapPublicBusinessProfile, mapPublicUserProfile } from "@/lib/community/serialize";

export async function discoverCommunity(params: {
  q?: string | null;
  city?: string | null;
  profile_type?: string | null;
  kind?: string | null;
  limit?: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const q = params.q?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const kind = (params.kind ?? "all").toLowerCase();
  const profileType = params.profile_type ? parseProfileType(params.profile_type) : undefined;

  const people =
    kind === "all" || kind === "people" || kind === "professionals" || kind === "creators"
      ? await prisma.communityUserProfile.findMany({
          where: {
            ...(profileType ? { profileType } : {}),
            ...(kind === "creators"
              ? { profileType: { in: ["CREATOR", "AUTOMOTIVE_EXPERT"] } }
              : {}),
            ...(city
              ? {
                  OR: [
                    { locationCity: { contains: city, mode: "insensitive" } },
                    { locationState: { contains: city, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(q
              ? {
                  OR: [
                    { displayName: { contains: q, mode: "insensitive" } },
                    { handle: { contains: q.toLowerCase(), mode: "insensitive" } },
                    { headline: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: { followerCount: "desc" },
          take,
        })
      : [];

  const dealerWhere: Prisma.DealerWhereInput = {
    deletedAt: null,
    ...(city
      ? {
          OR: [
            { city: { contains: city, mode: "insensitive" } },
            { state: { contains: city, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q.toLowerCase(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const dealers =
    kind === "all" || kind === "dealers" || kind === "businesses"
      ? await prisma.dealer.findMany({
          where: dealerWhere,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            description: true,
            logoUrl: true,
            isVerified: true,
          },
        })
      : [];

  const businesses =
    kind === "all" || kind === "businesses"
      ? await prisma.communityBusinessProfile.findMany({
          where: {
            ...(city
              ? {
                  OR: [
                    { city: { contains: city, mode: "insensitive" } },
                    { state: { contains: city, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(q
              ? {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { slug: { contains: q.toLowerCase(), mode: "insensitive" } },
                    { tagline: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: { followerCount: "desc" },
          take,
        })
      : [];

  return {
    people: people.map((p) => mapPublicUserProfile(p)),
    dealers: dealers.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      city: d.city,
      state: d.state,
      description: d.description,
      logo_url: d.logoUrl,
      is_verified: d.isVerified,
    })),
    businesses: businesses.map((b) => mapPublicBusinessProfile(b)),
  };
}

export async function findDealerIdBySlug(slug: string): Promise<string | null> {
  const dealer = await prisma.dealer.findFirst({
    where: { slug: slug.toLowerCase(), deletedAt: null },
    select: { id: true },
  });
  return dealer?.id ?? null;
}

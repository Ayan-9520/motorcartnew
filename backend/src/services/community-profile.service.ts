import type {
  AppRole,
  CommunityBusinessEntityType,
  CommunityPersona,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEALER_ROLES = new Set<AppRole>([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
]);

export function roleToPersona(role: AppRole): CommunityPersona {
  if (role === "customer") return "customer";
  if (DEALER_ROLES.has(role)) return "dealer";
  if (role === "broker") return "broker";
  if (
    role === "dsa_agent" ||
    role === "bank_nbfc" ||
    role === "finance_manager" ||
    role === "finance_partner"
  ) {
    return "dsa";
  }
  if (
    role === "service_center" ||
    role === "service_partner" ||
    role === "service_technician"
  ) {
    return "workshop";
  }
  if (role === "parts_seller") return "parts_seller";
  return "customer";
}

export function personaToEntityType(
  persona: CommunityPersona
): CommunityBusinessEntityType | null {
  const map: Partial<Record<CommunityPersona, CommunityBusinessEntityType>> = {
    dealer: "dealer",
    broker: "broker",
    dsa: "dsa",
    insurance_agent: "insurance_agent",
    workshop: "workshop",
    parts_seller: "parts_seller",
    influencer: "influencer",
  };
  return map[persona] ?? null;
}

function baseHandleFromName(name: string): string {
  const raw = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return raw || "user";
}

async function uniqueHandle(base: string, userId: string): Promise<string> {
  const suffix = userId.replace(/-/g, "").slice(0, 6);
  let candidate = `${base}_${suffix}`.slice(0, 32);
  let n = 0;
  while (true) {
    const exists = await prisma.communityUserProfile.findFirst({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    n += 1;
    candidate = `${base}_${suffix}${n}`.slice(0, 32);
  }
}

function slugifyBusiness(name: string, ownerId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const suffix = ownerId.replace(/-/g, "").slice(0, 6);
  return `${base || "business"}-${suffix}`;
}

export async function getOrCreateUserProfile(userId: string) {
  const existing = await prisma.communityUserProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const displayName = user.fullName?.trim() || user.email?.split("@")[0] || "Member";
  const handle = await uniqueHandle(baseHandleFromName(displayName), userId);
  const persona = roleToPersona(user.role);

  const profile = await prisma.communityUserProfile.create({
    data: {
      userId,
      persona,
      displayName: displayName.slice(0, 128),
      handle,
      avatarUrl: user.avatarUrl,
      bio: user.communityBio,
      coverUrl: user.communityCoverUrl,
      locationCity: user.city,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { communityHandle: handle },
  });

  return profile;
}

export async function getProfileByHandle(handle: string) {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  return prisma.communityUserProfile.findFirst({
    where: { handle: normalized },
    include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
  });
}

export async function updateUserProfile(
  userId: string,
  input: {
    display_name?: string;
    bio?: string | null;
    cover_url?: string | null;
    avatar_url?: string | null;
    location_city?: string | null;
    is_private?: boolean;
  }
) {
  const profile = await getOrCreateUserProfile(userId);
  const data: Record<string, unknown> = {};

  if (input.display_name !== undefined) {
    data.displayName = String(input.display_name).slice(0, 128);
  }
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.cover_url !== undefined) data.coverUrl = input.cover_url;
  if (input.avatar_url !== undefined) data.avatarUrl = input.avatar_url;
  if (input.location_city !== undefined) data.locationCity = input.location_city;
  if (input.is_private !== undefined) data.isPrivate = Boolean(input.is_private);

  const updated = await prisma.communityUserProfile.update({
    where: { id: profile.id },
    data,
  });

  const userPatch: Record<string, unknown> = {};
  if (input.bio !== undefined) userPatch.communityBio = input.bio;
  if (input.cover_url !== undefined) userPatch.communityCoverUrl = input.cover_url;
  if (input.avatar_url !== undefined) userPatch.avatarUrl = input.avatar_url;
  if (Object.keys(userPatch).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: userPatch });
  }

  return updated;
}

export async function getBusinessBySlug(slug: string) {
  return prisma.communityBusinessProfile.findUnique({
    where: { slug: slug.toLowerCase() },
  });
}

export async function getBusinessByEntity(entityType: string, entityId: string) {
  return prisma.communityBusinessProfile.findFirst({
    where: {
      entityType: entityType as CommunityBusinessEntityType,
      entityId,
    },
  });
}

export async function getMyBusinessProfile(ownerUserId: string) {
  return prisma.communityBusinessProfile.findFirst({
    where: { ownerUserId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBusinessProfile(
  ownerUserId: string,
  input: {
    name: string;
    entity_type?: CommunityBusinessEntityType;
    entity_id?: string | null;
    tagline?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
    website?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    social_links?: unknown;
  }
) {
  const userProfile = await getOrCreateUserProfile(ownerUserId);
  const entityType =
    input.entity_type ?? personaToEntityType(userProfile.persona) ?? "dealer";

  let slugBase = slugifyBusiness(input.name, ownerUserId);
  let slug = slugBase;
  let n = 0;
  while (await prisma.communityBusinessProfile.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugBase}-${n}`.slice(0, 64);
  }

  const metadata: Record<string, unknown> = {};
  if (input.social_links !== undefined) metadata.social_links = input.social_links;

  return prisma.communityBusinessProfile.create({
    data: {
      ownerUserId,
      entityType,
      entityId: input.entity_id ?? null,
      slug,
      name: input.name.slice(0, 128),
      tagline: input.tagline?.slice(0, 255) ?? null,
      logoUrl: input.logo_url ?? null,
      coverUrl: input.cover_url ?? null,
      website: input.website ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      metadata: (Object.keys(metadata).length ? metadata : {}) as Prisma.InputJsonValue,
    },
  });
}

export async function updateBusinessProfile(
  ownerUserId: string,
  slug: string,
  input: {
    name?: string;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
    website?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    social_links?: unknown;
  }
) {
  const row = await prisma.communityBusinessProfile.findFirst({
    where: { slug: slug.toLowerCase(), ownerUserId },
  });
  if (!row) return null;

  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? { ...(row.metadata as Record<string, unknown>) }
      : {};

  if (input.social_links !== undefined) meta.social_links = input.social_links;

  const tagline =
    input.description !== undefined
      ? input.description
      : input.tagline !== undefined
        ? input.tagline
        : undefined;

  return prisma.communityBusinessProfile.update({
    where: { id: row.id },
    data: {
      name: input.name?.slice(0, 128),
      tagline: tagline !== undefined ? tagline?.slice(0, 255) ?? null : undefined,
      logoUrl: input.logo_url,
      coverUrl: input.cover_url,
      website: input.website,
      phone: input.phone,
      city: input.city,
      state: input.state,
      metadata: (Object.keys(meta).length ? meta : row.metadata) as Prisma.InputJsonValue,
    },
  });
}

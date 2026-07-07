import { prisma } from "@/lib/prisma";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { DIRECTORY_CATEGORIES } from "@/lib/directory/constants";
import { scoreMatch } from "./scoring";
import type { SearchResultType, UnifiedSearchResult } from "./types";

const PER_PROVIDER = 12;

function directoryPath(entityType: string, slug: string): string {
  for (const [cat, type] of Object.entries(DIRECTORY_CATEGORIES)) {
    if (type === entityType) return `/directory/${cat}/${slug}`;
  }
  return `/business/${slug}`;
}

function vehicleResultType(category: string, condition: string): SearchResultType {
  if (category === "bikes" || category === "bike") return "bike";
  if (condition === "new" || category.includes("new")) return "new_car";
  if (condition === "used" || category.includes("used")) return "used_car";
  return "vehicle";
}

export async function searchVehicles(q: string): Promise<UnifiedSearchResult[]> {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    status: { in: ["available", "reserved"] as VehicleStatus[] },
    ...(q.trim()
      ? {
          OR: [
            { title: { contains: q } },
            { brand: { contains: q } },
            { model: { contains: q } },
            { city: { contains: q } },
            { variant: { contains: q } },
          ],
        }
      : {}),
  };

  const rows = await prisma.vehicle.findMany({
    where,
    take: PER_PROVIDER * 2,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  return rows.map((v) => {
    const rt = vehicleResultType(v.category, v.condition);
    const desc = `${v.year} ${v.brand} ${v.model} · ${v.city} · ₹${Number(v.price)}`;
    return {
      result_type: rt,
      title: v.title,
      description: desc,
      url: `/vehicles/${v.category}/${v.slug}`,
      source: "marketplace",
      score: scoreMatch(q, [v.title, v.brand, v.model, v.city, v.variant]),
      metadata: { id: v.id, category: v.category },
    };
  });
}

export async function searchAuctions(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.auction.findMany({
    where: q.trim()
      ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }
      : undefined,
    take: PER_PROVIDER,
    orderBy: { startsAt: "desc" },
  });

  return rows.map((a) => ({
    result_type: "auction" as const,
    title: a.title,
    description: `Auction · ${a.status} · starts ${a.startsAt.toISOString().slice(0, 10)}`,
    url: `/auctions/${a.status}/${a.slug}`,
    source: "auctions",
    score: scoreMatch(q, [a.title, a.slug]),
    metadata: { id: a.id, status: a.status },
  }));
}

export async function searchDealers(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.dealer.findMany({
    where: {
      deletedAt: null,
      ...(q.trim()
        ? { OR: [{ name: { contains: q } }, { city: { contains: q } }, { slug: { contains: q } }] }
        : {}),
    },
    take: PER_PROVIDER,
    orderBy: { name: "asc" },
  });

  return rows.map((d) => ({
    result_type: "dealer" as const,
    title: d.name,
    description: `${d.city}, ${d.state}${d.isVerified ? " · Verified" : ""}`,
    url: `/dealers/${d.slug}`,
    source: "dealers",
    score: scoreMatch(q, [d.name, d.city, d.slug]),
    metadata: { id: d.id },
  }));
}

export async function searchBrokers(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.broker.findMany({
    where: q.trim()
      ? { OR: [{ name: { contains: q } }, { city: { contains: q } }, { slug: { contains: q } }] }
      : undefined,
    take: PER_PROVIDER,
    orderBy: { name: "asc" },
  });

  return rows.map((b) => ({
    result_type: "broker" as const,
    title: b.name,
    description: `Broker · ${b.city}, ${b.state}`,
    url: `/community/business/${b.slug}`,
    source: "brokers",
    score: scoreMatch(q, [b.name, b.city, b.slug]),
    metadata: { id: b.id },
  }));
}

async function searchBusinessByType(
  q: string,
  entityType: string,
  resultType: SearchResultType,
  source: string
): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.communityBusinessProfile.findMany({
    where: {
      entityType: entityType as never,
      ...(q.trim()
        ? {
            OR: [
              { name: { contains: q } },
              { tagline: { contains: q } },
              { city: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    },
    take: PER_PROVIDER,
    orderBy: [{ isVerified: "desc" }, { followerCount: "desc" }],
  });

  return rows.flatMap((b) => {
    const base = {
      title: b.name,
      description: b.tagline ?? `${entityType} · ${b.city ?? ""}`,
      score: scoreMatch(q, [b.name, b.tagline, b.city, b.slug]),
      metadata: { id: b.id, entity_type: b.entityType },
    };
    const items: UnifiedSearchResult[] = [
      {
        ...base,
        result_type: resultType,
        url: `/community/business/${b.slug}`,
        source,
      },
      {
        ...base,
        result_type: "directory_listing",
        title: `${b.name} (Directory)`,
        url: directoryPath(b.entityType, b.slug),
        source: "directory",
        score: base.score,
      },
      {
        ...base,
        result_type: "business_page",
        title: `${b.name} (Hub)`,
        url: `/business/${b.slug}`,
        source: "business_hub",
        score: base.score - 0.1,
      },
    ];
    return items;
  });
}

export function searchDsa(q: string) {
  return searchBusinessByType(q, "dsa", "dsa", "directory");
}

export function searchInsurance(q: string) {
  return searchBusinessByType(q, "insurance_agent", "insurance_agent", "directory");
}

export function searchWorkshops(q: string) {
  return searchBusinessByType(q, "workshop", "workshop", "directory");
}

export function searchPartsSellers(q: string) {
  return searchBusinessByType(q, "parts_seller", "parts_seller", "directory");
}

export async function searchPartsCatalog(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.part.findMany({
    where: {
      isActive: true,
      ...(q.trim()
        ? {
            OR: [
              { name: { contains: q } },
              { brand: { contains: q } },
              { category: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    },
    take: PER_PROVIDER,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((p) => ({
    result_type: "parts_seller" as const,
    title: p.name,
    description: `${p.category}${p.brand ? ` · ${p.brand}` : ""} · ₹${Number(p.price)}`,
    url: `/parts/${p.category}/${p.slug}`,
    source: "parts",
    score: scoreMatch(q, [p.name, p.brand, p.category, p.slug]),
    metadata: { id: p.id },
  }));
}

export async function searchCommunityPosts(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.socialPost.findMany({
    where: {
      deletedAt: null,
      moderationStatus: "approved",
      ...(q.trim() ? { content: { contains: q } } : {}),
    },
    take: PER_PROVIDER,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((p) => ({
    result_type: "community_post" as const,
    title: p.content.slice(0, 80) + (p.content.length > 80 ? "…" : ""),
    description: `Community post · ${p.postKind}`,
    url: `/community/post/${p.id}`,
    source: "community",
    score: scoreMatch(q, [p.content]),
    metadata: { id: p.id },
  }));
}

export async function searchCommunityGroups(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.communityGroup.findMany({
    where: q.trim()
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : undefined,
    take: PER_PROVIDER,
    orderBy: { memberCount: "desc" },
  });

  return rows.map((g) => ({
    result_type: "community_group" as const,
    title: g.name,
    description: g.description?.slice(0, 120) ?? `Group · ${g.memberCount} members`,
    url: `/community/groups/${g.slug}`,
    source: "community",
    score: scoreMatch(q, [g.name, g.description, g.slug]),
    metadata: { id: g.id },
  }));
}

export async function searchGrowthTemplates(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.growthWhatsappTemplate.findMany({
    where: q.trim()
      ? {
          OR: [
            { name: { contains: q } },
            { templateKey: { contains: q } },
            { body: { contains: q } },
          ],
        }
      : undefined,
    take: PER_PROVIDER,
    orderBy: { updatedAt: "desc" },
    include: { workspace: { select: { slug: true, name: true } } },
  });

  return rows.map((t) => ({
    result_type: "growth_template" as const,
    title: t.name,
    description: `WhatsApp template · ${t.workspace.name} · ${t.status}`,
    url: `/dashboard/growth/whatsapp`,
    source: "growth",
    score: scoreMatch(q, [t.name, t.templateKey, t.body]),
    metadata: { id: t.id, workspace_slug: t.workspace.slug },
  }));
}

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
    const isNew = v.condition === "new" || v.category === "new-cars";
    const hub =
      v.category === "bikes"
        ? "bikes"
        : v.category === "trucks"
          ? "trucks"
          : v.category === "buses"
            ? "buses"
            : v.category === "ev" || String(v.fuelType ?? "").toLowerCase() === "electric"
              ? "ev"
              : "cars";
    const condition = isNew ? "new" : "used";
    return {
      result_type: rt,
      title: v.title,
      description: desc,
      url: `/buy/${hub}/${condition}/${encodeURIComponent(v.slug)}`,
      source: "marketplace",
      score: scoreMatch(q, [v.title, v.brand, v.model, v.city, v.variant]),
      metadata: { id: v.id, category: v.category, slug: v.slug },
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
        ? { OR: [{ name: { contains: q } }, { city: { contains: q } }, { slug: { contains: q } }, { pincode: { contains: q } }] }
        : {}),
    },
    take: PER_PROVIDER,
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true, slug: true, isVerified: true, pincode: true },
  });

  return rows.map((d) => ({
    result_type: "dealer" as const,
    title: d.name,
    description: `${d.city}, ${d.state}${d.isVerified ? " · Verified" : ""}`,
    url: `/dealers/${d.slug}`,
    source: "dealers",
    score: scoreMatch(q, [d.name, d.city, d.slug, d.pincode]),
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
  const rows = await prisma.partProduct.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(q.trim()
        ? {
            OR: [
              { name: { contains: q } },
              { brand: { contains: q } },
              { partNumber: { contains: q } },
              { sku: { contains: q } },
              { categorySlug: { contains: q } },
            ],
          }
        : {}),
    },
    take: PER_PROVIDER,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((p) => ({
    result_type: "part" as const,
    title: p.name,
    description: [p.brand, p.partNumber, p.categorySlug, p.stock > 0 ? "In seller stock" : "Listed"]
      .filter(Boolean)
      .join(" · "),
    url: `/parts?q=${encodeURIComponent(p.name)}`,
    source: "parts",
    score: scoreMatch(q, [p.name, p.brand, p.partNumber, p.sku]),
    metadata: { id: p.id, stock: p.stock },
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

export async function searchOrganizations(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      status: "active",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_PROVIDER,
    select: { id: true, slug: true, displayName: true, type: true },
  });
  return rows.map((o) => ({
    result_type: "company" as const,
    title: o.displayName,
    description: o.type,
    url: `/company/${o.slug}`,
    source: "organizations",
    score: scoreMatch(q, [o.displayName, o.slug, o.type]),
    metadata: { id: o.id, type: o.type },
  }));
}

export async function searchJobsPublic(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.jobPosting.findMany({
    where: {
      status: "OPEN",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { careerPath: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_PROVIDER,
    select: { id: true, title: true, location: true, careerPath: true, salaryMin: true, salaryMax: true },
  });
  return rows.map((j) => ({
    result_type: "job" as const,
    title: j.title,
    description: [j.location, j.careerPath].filter(Boolean).join(" · "),
    url: `/jobs/${j.id}`,
    source: "jobs",
    score: scoreMatch(q, [j.title, j.location, j.careerPath]),
    metadata: { id: j.id },
  }));
}

export async function searchProfessionals(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.communityUserProfile.findMany({
    where: {
      isPrivate: false,
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { headline: { contains: q, mode: "insensitive" } },
        { handle: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_PROVIDER,
    select: { userId: true, displayName: true, headline: true, handle: true, locationCity: true },
  });
  return rows.map((p) => ({
    result_type: "professional" as const,
    title: p.displayName,
    description: [p.headline, p.locationCity].filter(Boolean).join(" · "),
    url: `/community/@${p.handle}`,
    source: "community",
    score: scoreMatch(q, [p.displayName, p.headline, p.handle]),
    metadata: { userId: p.userId },
  }));
}

export async function searchFinanceProducts(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.financeProduct.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { loanType: { contains: q, mode: "insensitive" } },
        { vehicleCategory: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_PROVIDER,
    select: { id: true, name: true, loanType: true, vehicleCategory: true },
  });
  return rows.map((p) => ({
    result_type: "finance_product" as const,
    title: p.name,
    description: [p.loanType, p.vehicleCategory].filter(Boolean).join(" · "),
    url: `/finance`,
    source: "finance",
    score: scoreMatch(q, [p.name, p.loanType, p.vehicleCategory]),
    metadata: { id: p.id },
  }));
}

export async function searchInsurancePartners(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.insurancePartner.findMany({
    where: {
      isActive: true,
      OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }],
    },
    take: PER_PROVIDER,
    select: { id: true, name: true, slug: true },
  });
  return rows.map((p) => ({
    result_type: "insurance_partner" as const,
    title: p.name,
    description: "Insurance partner",
    url: `/insurance`,
    source: "insurance",
    score: scoreMatch(q, [p.name, p.slug]),
    metadata: { id: p.id },
  }));
}

export async function searchServiceCentersPublic(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.serviceCenter.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { pincode: q },
      ],
    },
    take: PER_PROVIDER,
    select: { id: true, name: true, city: true, slug: true, pincode: true },
  });
  return rows.map((c) => ({
    result_type: "service_center" as const,
    title: c.name,
    description: [c.city, c.pincode].filter(Boolean).join(" · "),
    url: `/services/${c.slug}`,
    source: "service",
    score: scoreMatch(q, [c.name, c.city, c.pincode]),
    metadata: { id: c.id },
  }));
}

/** Dealer-held new-car stock only — never CatalogVariant / master catalog. */
export async function searchNewCarStock(q: string): Promise<UnifiedSearchResult[]> {
  const rows = await prisma.newCarInventory.findMany({
    where: {
      stock: { gt: 0 },
      stockStatus: "available",
      OR: [
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { variant: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_PROVIDER,
    select: { id: true, brand: true, model: true, variant: true, year: true },
  });
  return rows.map((r) => {
    const slug = `ncd-${r.id}`;
    const title = [r.year, r.brand, r.model, r.variant].filter(Boolean).join(" ").trim();
    return {
      result_type: "new_car_stock" as const,
      title: title || `${r.brand} ${r.model}`,
      description: r.variant ? `${r.variant} · dealer stock` : "Dealer stock · new car",
      // Detail page resolves ncd-{uuid} via /new-cars/:slug and buy hub
      url: `/buy/cars/new/${encodeURIComponent(slug)}`,
      source: "dealer_stock",
      score: scoreMatch(q, [r.brand, r.model, r.variant]),
      metadata: { id: r.id, slug },
    };
  });
}

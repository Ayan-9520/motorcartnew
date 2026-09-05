import { prisma } from "@/lib/prisma";
import { categoryFilterTypes, SEARCH_CATEGORIES } from "@/lib/unified-search/categories";
import { boundPage, sanitizeSearchQuery } from "@/lib/http/request-meta";
import { rankResults } from "@/lib/unified-search/scoring";
import {
  searchAuctions,
  searchBrokers,
  searchCommunityGroups,
  searchCommunityPosts,
  searchDealers,
  searchDsa,
  searchFinanceProducts,
  searchInsurance,
  searchInsurancePartners,
  searchJobsPublic,
  searchNewCarStock,
  searchOrganizations,
  searchPartsCatalog,
  searchPartsSellers,
  searchProfessionals,
  searchServiceCentersPublic,
  searchVehicles,
  searchWorkshops,
} from "@/lib/unified-search/providers";
import type { UnifiedSearchResult } from "@/lib/unified-search/types";

const ARCHITECTURE = {
  mode: "federated",
  providers: [
    "vehicles",
    "new_car_stock",
    "auctions",
    "dealers",
    "organizations",
    "jobs",
    "professionals",
    "finance_products",
    "insurance",
    "service_centers",
    "parts",
    "community",
  ],
  note: "PostgreSQL ILIKE federation. Catalog-only rows are never labeled as dealer stock. Growth templates are not public.",
} as const;

const PII_RE = /phone|email|gst|pan|password|secret|token|aadhaar|accountNumber|ifsc|otp/i;

function dedupeByUrl(items: UnifiedSearchResult[]): UnifiedSearchResult[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.result_type}:${i.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterByTypes(items: UnifiedSearchResult[], types: string[] | null) {
  if (!types?.length) return items;
  return items.filter((i) => types.includes(i.result_type));
}

function publicSafe(item: UnifiedSearchResult): UnifiedSearchResult {
  const blob = JSON.stringify(item.metadata ?? {});
  if (!PII_RE.test(blob) && !PII_RE.test(item.description) && !PII_RE.test(item.title)) return item;
  return {
    ...item,
    description: item.description.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[redacted]"),
    metadata: item.metadata && typeof item.metadata === "object" ? { id: (item.metadata as { id?: string }).id } : {},
  };
}

export function getSearchCategories() {
  return {
    architecture: ARCHITECTURE,
    categories: SEARCH_CATEGORIES,
  };
}

export async function federatedSearch(params: {
  q: string;
  category?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const q = sanitizeSearchQuery(params.q);
  const { limit, offset } = boundPage(params.limit, params.offset, 40);
  const typeFilter = categoryFilterTypes(params.type ?? params.category);

  if (q.length < 2) {
    return {
      query: q,
      category: params.category ?? params.type ?? null,
      total: 0,
      limit,
      offset,
      by_type: {} as Record<string, number>,
      results: [] as UnifiedSearchResult[],
      architecture: ARCHITECTURE,
      hint: "Enter at least 2 characters",
    };
  }

  const [
    vehicles,
    stock,
    auctions,
    dealers,
    brokers,
    dsa,
    insurance,
    partners,
    workshops,
    centers,
    partsSellers,
    parts,
    posts,
    groups,
    companies,
    jobs,
    professionals,
    finance,
  ] = await Promise.all([
    searchVehicles(q),
    searchNewCarStock(q),
    searchAuctions(q),
    searchDealers(q),
    searchBrokers(q),
    searchDsa(q),
    searchInsurance(q),
    searchInsurancePartners(q),
    searchWorkshops(q),
    searchServiceCentersPublic(q),
    searchPartsSellers(q),
    searchPartsCatalog(q),
    searchCommunityPosts(q),
    searchCommunityGroups(q),
    searchOrganizations(q),
    searchJobsPublic(q),
    searchProfessionals(q),
    searchFinanceProducts(q),
  ]);

  let merged = dedupeByUrl([
    ...vehicles,
    ...stock,
    ...auctions,
    ...dealers,
    ...brokers,
    ...dsa,
    ...insurance,
    ...partners,
    ...workshops,
    ...centers,
    ...partsSellers,
    ...parts,
    ...posts,
    ...groups,
    ...companies,
    ...jobs,
    ...professionals,
    ...finance,
  ]).map(publicSafe);

  merged = filterByTypes(merged, typeFilter);
  merged = rankResults(merged, q);

  const total = merged.length;
  const results = merged.slice(offset, offset + limit);

  const by_type: Record<string, number> = {};
  for (const r of merged) {
    by_type[r.result_type] = (by_type[r.result_type] ?? 0) + 1;
  }

  return {
    query: q,
    category: params.category ?? params.type ?? null,
    total,
    limit,
    offset,
    by_type,
    results,
    architecture: ARCHITECTURE,
  };
}

export async function searchSuggestions(q: string, limit = 10) {
  const needle = sanitizeSearchQuery(q);
  if (needle.length < 2) return { query: needle, suggestions: [] as string[] };

  const [vehicles, businesses, dealers] = await Promise.all([
    prismaVehicleHints(needle),
    prismaBusinessHints(needle),
    prismaDealerHints(needle),
  ]);

  const suggestions = [...new Set([...vehicles, ...businesses, ...dealers])].slice(0, Math.min(limit, 10));
  return { query: needle, suggestions };
}

async function prismaVehicleHints(q: string) {
  const rows = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      status: "available",
      OR: [{ brand: { contains: q } }, { model: { contains: q } }, { title: { contains: q } }],
    },
    select: { brand: true, model: true, title: true },
    take: 8,
  });
  return rows.flatMap((r) => [`${r.brand} ${r.model}`.trim(), r.title]).filter(Boolean);
}

async function prismaBusinessHints(q: string) {
  const rows = await prisma.communityBusinessProfile.findMany({
    where: { name: { contains: q } },
    select: { name: true },
    take: 6,
  });
  return rows.map((r) => r.name);
}

async function prismaDealerHints(q: string) {
  const rows = await prisma.dealer.findMany({
    where: { deletedAt: null, name: { contains: q } },
    select: { name: true },
    take: 4,
  });
  return rows.map((r) => r.name);
}

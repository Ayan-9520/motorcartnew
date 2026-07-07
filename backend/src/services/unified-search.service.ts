import { prisma } from "@/lib/prisma";
import { categoryFilterTypes, SEARCH_CATEGORIES } from "@/lib/unified-search/categories";
import { rankResults } from "@/lib/unified-search/scoring";
import {
  searchAuctions,
  searchBrokers,
  searchCommunityGroups,
  searchCommunityPosts,
  searchDealers,
  searchDsa,
  searchGrowthTemplates,
  searchInsurance,
  searchPartsCatalog,
  searchPartsSellers,
  searchVehicles,
  searchWorkshops,
} from "@/lib/unified-search/providers";
import type { UnifiedSearchResult } from "@/lib/unified-search/types";

const ARCHITECTURE = {
  mode: "federated",
  providers: [
    "vehicles",
    "auctions",
    "dealers",
    "brokers",
    "business_profiles",
    "parts",
    "community",
    "growth",
  ],
  note: "Read-only SQL aggregation. No source module modifications. No data moves.",
} as const;

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

export function getSearchCategories() {
  return {
    architecture: ARCHITECTURE,
    categories: SEARCH_CATEGORIES,
  };
}

export async function federatedSearch(params: {
  q: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const q = params.q?.trim() ?? "";
  const limit = Math.min(params.limit ?? 60, 120);
  const offset = params.offset ?? 0;
  const typeFilter = categoryFilterTypes(params.category);

  const [
    vehicles,
    auctions,
    dealers,
    brokers,
    dsa,
    insurance,
    workshops,
    partsSellers,
    parts,
    posts,
    groups,
    growth,
  ] = await Promise.all([
    searchVehicles(q),
    searchAuctions(q),
    searchDealers(q),
    searchBrokers(q),
    searchDsa(q),
    searchInsurance(q),
    searchWorkshops(q),
    searchPartsSellers(q),
    searchPartsCatalog(q),
    searchCommunityPosts(q),
    searchCommunityGroups(q),
    searchGrowthTemplates(q),
  ]);

  let merged = dedupeByUrl([
    ...vehicles,
    ...auctions,
    ...dealers,
    ...brokers,
    ...dsa,
    ...insurance,
    ...workshops,
    ...partsSellers,
    ...parts,
    ...posts,
    ...groups,
    ...growth,
  ]);

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
    category: params.category ?? null,
    total,
    limit,
    offset,
    by_type,
    results,
    architecture: ARCHITECTURE,
  };
}

export async function searchSuggestions(q: string, limit = 10) {
  const needle = q.trim();
  if (needle.length < 2) return { query: needle, suggestions: [] as string[] };

  const [vehicles, businesses, dealers] = await Promise.all([
    prismaVehicleHints(needle),
    prismaBusinessHints(needle),
    prismaDealerHints(needle),
  ]);

  const suggestions = [...new Set([...vehicles, ...businesses, ...dealers])].slice(0, limit);
  return { query: needle, suggestions };
}

async function prismaVehicleHints(q: string) {
  const rows = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
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

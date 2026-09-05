import { parseAIIntent } from "@/ai/ecosystem/ai-intent";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { MOCK_PARTS_CATALOG } from "@/features/parts/data/mock-parts-catalog";
import { fetchFederatedSearch } from "@/integrations/api/unified-search";
import { filterVehicles, vehicleDetailPath } from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";
import type { PartProduct } from "@/features/parts/types";
import { resolvePartHero, resolveVehicleHero } from "@/lib/media/resolve-images";

export type GlobalSearchResultType = "vehicle" | "part" | "page" | "job" | "dealer" | "company";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  badge?: string;
}

const QUICK_PAGES: GlobalSearchResult[] = [
  { id: "buy", type: "page", title: "Buy vehicles", subtitle: "New & pre-owned across all categories", href: "/buy", badge: "Buy" },
  { id: "finance", type: "page", title: "Car loans & EMI", subtitle: "Compare banks & apply online", href: "/finance", badge: "Finance" },
  { id: "auctions", type: "page", title: "Live auctions", subtitle: "Bid on repo & fleet vehicles", href: "/auctions", badge: "Auctions" },
  { id: "parts", type: "page", title: "Auto parts", subtitle: "OEM & aftermarket marketplace", href: "/parts", badge: "Parts" },
  { id: "services", type: "page", title: "Book service", subtitle: "Servicing, PPF, tyres & more", href: "/services", badge: "Services" },
  { id: "dealers", type: "page", title: "Dealer network", subtitle: "Verified dealers", href: "/dealers", badge: "Dealers" },
  { id: "wishlist", type: "page", title: "My wishlist", subtitle: "Saved vehicles", href: "/wishlist", badge: "Saved" },
];

function matchesNeedle(text: string, needle: string): boolean {
  return text.toLowerCase().includes(needle);
}

function vehicleToResult(v: VehicleListing): GlobalSearchResult {
  const hub =
    v.category === "new-cars" || v.category === "used-cars"
      ? "cars"
      : v.category === "bikes"
        ? "bikes"
        : v.category === "trucks"
          ? "trucks"
          : v.category === "buses"
            ? "buses"
            : v.category === "ev"
              ? "ev"
              : "cars";
  const condition = v.condition === "new" ? "new" : "used";
  return {
    id: `v-${v.id}`,
    type: "vehicle",
    title: v.title,
    subtitle: `${v.city} · ${v.dealerName ?? "Motorcart"}`,
    href: vehicleDetailPath(v),
    image: resolveVehicleHero(v.brand, v.model, v.bodyType, v.images, 0, {
      category: v.category,
      fuelType: v.fuelType,
    }),
    badge: `${hub} · ${condition}`,
  };
}

function partToResult(p: PartProduct): GlobalSearchResult {
  return {
    id: `p-${p.id}`,
    type: "part",
    title: p.name,
    subtitle: `${p.brand ?? "Aftermarket"} · ₹${p.price.toLocaleString("en-IN")}`,
    href: `/parts/browse?q=${encodeURIComponent(p.name)}`,
    image: resolvePartHero(p.categorySlug, p.slug, p.images),
    badge: "Parts",
  };
}

export function getAISearchIntent(query: string) {
  return parseAIIntent(query);
}

export function runGlobalSearch(query: string, limit = 8): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return QUICK_PAGES.slice(0, 6);

  const intent = parseAIIntent(query);
  if (intent && intent.confidence >= 0.55) {
    const intentResult: GlobalSearchResult = {
      id: "ai-intent",
      type: "page",
      title: `AI: ${intent.label}`,
      subtitle: "Suggested destination for your query",
      href: intent.href,
      badge: "AI",
    };
    const rest = runGlobalSearchInner(q, limit);
    return [intentResult, ...rest.filter((r) => r.id !== "ai-intent")].slice(0, limit + 2);
  }

  return runGlobalSearchInner(q, limit);
}

function runGlobalSearchInner(query: string, limit = 8, vehicles = MOCK_VEHICLES, parts = MOCK_PARTS_CATALOG): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();

  const vehicleResults = filterVehicles(vehicles.filter((v) => v.status === "available"), { q: query.trim() })
    .slice(0, limit)
    .map(vehicleToResult);

  const partResults = parts.filter(
    (p) =>
      matchesNeedle(p.name, q) ||
      matchesNeedle(p.brand ?? "", q) ||
      matchesNeedle(p.categorySlug, q) ||
      matchesNeedle(p.sku ?? "", q)
  )
    .slice(0, 4)
    .map(partToResult);

  const pages = QUICK_PAGES.filter(
    (p) => matchesNeedle(p.title, q) || matchesNeedle(p.subtitle, q) || matchesNeedle(p.badge ?? "", q)
  );

  return [...vehicleResults, ...partResults, ...pages].slice(0, limit + 4);
}

function mapFederatedType(t: string): GlobalSearchResultType {
  if (t === "part") return "part";
  if (t === "job") return "job";
  if (t === "dealer") return "dealer";
  if (t === "company" || t === "business_page") return "company";
  if (t.includes("car") || t === "vehicle" || t === "bike" || t === "auction" || t === "new_car_stock") return "vehicle";
  return "page";
}

/** Idle shortcuts for empty search (real + mock modes). */
export function getGlobalSearchIdleResults(limit = 6): GlobalSearchResult[] {
  return QUICK_PAGES.slice(0, limit);
}

/** Live federated search with live inventory + page fallbacks (no mock catalogs). */
export async function runGlobalSearchAsync(query: string, limit = 10): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return getGlobalSearchIdleResults(limit);

  const data = await fetchFederatedSearch({ q, limit });
  const rows = (data?.results ?? []).map((item) => {
    const meta = (item as { metadata?: { id?: string; slug?: string; category?: string } }).metadata;
    return {
      id: `${item.result_type}-${item.url}-${meta?.id ?? ""}`,
      type: mapFederatedType(item.result_type),
      title: item.title,
      subtitle: item.description,
      href: normalizeSearchHref(item.url, meta),
      badge: item.result_type.replace(/_/g, " "),
    };
  });

  if (rows.length > 0) return rows.slice(0, limit);

  // Fallback: public new-car stock + vehicle pool
  try {
    const { api } = await import("@/lib/api/axios");
    const { hasConfiguredApi } = await import("@/lib/api/base-url");
    if (hasConfiguredApi()) {
      const { data: stockPayload } = await api.get<{ data?: Record<string, unknown>[] }>("/api/new-car/stock", {
        params: { q, limit },
      });
      const stockRows = Array.isArray(stockPayload?.data) ? stockPayload.data : [];
      const stockResults: GlobalSearchResult[] = stockRows.slice(0, limit).map((r) => {
        const id = String(r.id ?? "");
        const brand = String(r.brand ?? "");
        const model = String(r.model ?? "");
        const variant = r.variant != null ? String(r.variant) : "";
        const year = r.year != null ? String(r.year) : "";
        const slug = `ncd-${id}`;
        return {
          id: `stock-${id}`,
          type: "vehicle" as const,
          title: [year, brand, model, variant].filter(Boolean).join(" ").trim() || `${brand} ${model}`,
          subtitle: "New car · dealer stock",
          href: `/buy/cars/new/${encodeURIComponent(slug)}`,
          badge: "new car",
        };
      });
      if (stockResults.length) return stockResults;
    }
  } catch {
    /* fall through */
  }

  try {
    const { getVehiclePool } = await import("@/services/vehicle.service");
    const pool = await getVehiclePool();
    const local = runGlobalSearchInner(q, limit, pool, []);
    if (local.length > 0) return local.slice(0, limit);
  } catch {
    /* fall through */
  }

  // Last resort: open real listing filtered by query
  const fallback: GlobalSearchResult[] = [
    {
      id: "browse-q",
      type: "page",
      title: `Browse “${q}”`,
      subtitle: "Open marketplace results for this search",
      href: buildTrendingSearchHref({ query: q, preferNew: true }),
      badge: "Search",
    },
    ...QUICK_PAGES.filter(
      (p) => matchesNeedle(p.title, q.toLowerCase()) || matchesNeedle(p.subtitle, q.toLowerCase())
    ).slice(0, 4),
  ];
  return fallback.slice(0, limit);
}

export function buildBuySearchUrl(q: string, hub = "cars", condition: "new" | "used" = "used"): string {
  const base = `/buy/${hub}/${condition}`;
  const trimmed = q.trim();
  if (!trimmed) return base;
  return `${base}?q=${encodeURIComponent(trimmed)}`;
}

export function buildSearchPageUrl(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) return "/search";
  return `/search?q=${encodeURIComponent(trimmed)}`;
}

/** Trending / typed query → real marketplace listing (not a dead page). */
export function buildTrendingSearchHref(input: {
  query: string;
  mode?: "cars" | "bikes" | "trucks" | "buses" | "ev";
  preferNew?: boolean;
}): string {
  const q = input.query.trim();
  if (!q) return "/buy";
  const lower = q.toLowerCase();
  const isEv = /\bev\b|electric|nexon ev|tiago ev|punch ev|windsor|mg zs|byd|ioniq|leaf/i.test(lower);
  const mode = input.mode ?? (isEv ? "ev" : "cars");

  if (mode === "bikes") return buildBuySearchUrl(q, "bikes", "used");
  if (mode === "trucks") return buildBuySearchUrl(q, "trucks", "used");
  if (mode === "buses") return buildBuySearchUrl(q, "buses", "used");
  if (mode === "ev" || isEv) {
    const base = buildBuySearchUrl(q, "cars", "new");
    return `${base}${base.includes("?") ? "&" : "?"}fuel=${encodeURIComponent("Electric")}`;
  }

  const preferNew =
    input.preferNew ??
    /creta|seltos|venue|brezza|nexon|punch|xuv|scorpio|fortuner|innova|city|virtus|slavia|fronx|baleno/i.test(lower);
  return buildBuySearchUrl(q, "cars", preferNew ? "new" : "used");
}

/**
 * Normalize legacy / broken federated URLs to live SPA routes.
 * e.g. /vehicles/new-cars/slug → /buy/cars/new/slug ; bare /new-cars + id → detail.
 */
export function normalizeSearchHref(url: string, meta?: { id?: string; slug?: string; category?: string }): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "/buy";

  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(raw, "http://local");
    let path = u.pathname;
    const qs = u.search;

    // Bare new-cars hub with stock id → detail
    if ((path === "/new-cars" || path === "/new-cars/") && meta?.id) {
      return `/buy/cars/new/${encodeURIComponent(`ncd-${meta.id}`)}`;
    }

    const veh = path.match(/^\/vehicles\/([^/]+)\/([^/]+)\/?$/i);
    if (veh) {
      const category = decodeURIComponent(veh[1]!);
      const slug = decodeURIComponent(veh[2]!);
      if (/^ncd-/i.test(slug) || category === "new-cars") {
        return `/buy/cars/new/${encodeURIComponent(slug)}`;
      }
      if (category === "bikes") return `/buy/bikes/used/${encodeURIComponent(slug)}`;
      if (category === "trucks") return `/buy/trucks/used/${encodeURIComponent(slug)}`;
      if (category === "buses") return `/buy/buses/used/${encodeURIComponent(slug)}`;
      if (category === "ev") return `/buy/ev/new/${encodeURIComponent(slug)}`;
      return `/buy/cars/used/${encodeURIComponent(slug)}`;
    }

    const ncd = path.match(/^\/new-cars\/([^/]+)\/?$/i);
    if (ncd) {
      const slug = decodeURIComponent(ncd[1]!);
      if (slug && slug !== "browse") return `/buy/cars/new/${encodeURIComponent(slug)}`;
      return `/buy/cars/new${qs}`;
    }

    // Already buy / other valid paths
    if (path.startsWith("/buy/") || path.startsWith("/parts") || path.startsWith("/finance") || path.startsWith("/services") || path.startsWith("/auctions") || path.startsWith("/dealers") || path.startsWith("/wishlist") || path.startsWith("/search")) {
      return `${path}${qs}`;
    }

    return `${path}${qs}` || "/buy";
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export { QUICK_PAGES };

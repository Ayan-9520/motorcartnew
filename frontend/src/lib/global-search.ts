import { parseAIIntent } from "@/ai/ecosystem/ai-intent";
import { realDataOnly } from "@/config/real-data";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { MOCK_PARTS_CATALOG } from "@/features/parts/data/mock-parts-catalog";
import { fetchParts } from "@/features/parts/services/parts.service";
import { fetchVehiclesFromDb } from "@/services/vehicle.service";
import { filterVehicles, vehicleDetailPath } from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";
import type { PartProduct } from "@/features/parts/types";
import { resolvePartHero, resolveVehicleHero } from "@/lib/media/resolve-images";

export type GlobalSearchResultType = "vehicle" | "part" | "page";

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
  { id: "dealers", type: "page", title: "Dealer network", subtitle: "8,500+ verified showrooms", href: "/dealers", badge: "Dealers" },
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

/** DB-backed search for real-data mode (Ctrl+K dialog). */
export async function runGlobalSearchAsync(query: string, limit = 10): Promise<GlobalSearchResult[]> {
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
    const [vehicles, parts] = await Promise.all([fetchVehiclesFromDb(200), fetchParts({})]);
    const rest = runGlobalSearchInner(q, limit, vehicles, parts);
    return [intentResult, ...rest.filter((r) => r.id !== "ai-intent")].slice(0, limit + 2);
  }

  const [vehicles, parts] = await Promise.all([fetchVehiclesFromDb(200), fetchParts({})]);
  return runGlobalSearchInner(q, limit, vehicles, parts);
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

export { QUICK_PAGES };

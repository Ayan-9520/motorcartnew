import type { EcosystemHubSlug } from "../types";
import { ECOSYSTEM_HUB_SLUGS } from "../types";
import {
  buyListingPath,
  parseHubCategorySlug,
} from "@/features/marketplace/lib/route-utils";

export function hubLandingPath(slug: EcosystemHubSlug): string {
  // Legacy /cars|/bikes hub pages removed — land on Buy listings
  return hubBuyPath(slug, "used");
}

export function hubSearchPath(slug: EcosystemHubSlug, query?: string): string {
  const params = new URLSearchParams({ hub: slug });
  if (query?.trim()) params.set("q", query.trim());
  return `/search?${params.toString()}`;
}

/** Canonical buy listing — same as marketplace `buyListingPath` */
export function hubBuyPath(slug: EcosystemHubSlug, condition: "new" | "used" = "used"): string {
  const hub = parseHubCategorySlug(slug);
  if (!hub) return buyListingPath("cars", condition);
  return buyListingPath(hub, condition);
}

export function hubSellPath(slug: EcosystemHubSlug): string {
  return `/sell/${slug}`;
}

export function parseEcosystemHubFromPath(pathname: string): EcosystemHubSlug | undefined {
  const segment = pathname.replace(/^\//, "").split("/")[0];
  return ECOSYSTEM_HUB_SLUGS.includes(segment as EcosystemHubSlug)
    ? (segment as EcosystemHubSlug)
    : undefined;
}

export function isEcosystemHubPath(pathname: string): boolean {
  return parseEcosystemHubFromPath(pathname) !== undefined;
}

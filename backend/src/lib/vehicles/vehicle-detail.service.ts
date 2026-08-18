import { prisma } from "@/lib/prisma";
import type { VehicleDetail, VehicleDetailDealer, VehicleSourceType } from "./vehicle-detail.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mapDealer(row: {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  phone?: string | null;
  isVerified?: boolean | null;
} | null | undefined): VehicleDetailDealer | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    city: row.city ?? null,
    phone: row.phone ?? null,
    is_verified: row.isVerified ?? null,
  };
}

function locationFrom(city: string | null | undefined, state: string | null | undefined, location?: string | null): string | null {
  if (location && location.trim()) return location.trim();
  const parts = [city, state].filter((p): p is string => !!p && p.trim().length > 0);
  return parts.length ? parts.join(", ") : null;
}

export function emptyVehicleDetail(partial: Partial<VehicleDetail> & { id: string; source_type: VehicleSourceType }): VehicleDetail {
  return {
    brand: null,
    model: null,
    variant: null,
    year: null,
    fuel: null,
    transmission: null,
    price: null,
    location: null,
    dealer: null,
    media: [],
    availability: null,
    purchasable: false,
    enquiry_allowed: true,
    slug: null,
    title: null,
    body_type: null,
    category: null,
    city: null,
    state: null,
    catalog_variant_id: null,
    ...partial,
  };
}

type MarketplaceRow = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  price: unknown;
  fuelType: string;
  transmission: string;
  bodyType: string;
  category: string;
  location: string | null;
  city: string;
  state: string;
  images: unknown;
  status: string;
  catalogVariantId: string | null;
  dealerId: string | null;
  dealer?: {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    phone: string | null;
    isVerified: boolean | null;
  } | null;
};

export function mapMarketplaceVehicle(row: MarketplaceRow): VehicleDetail {
  const dealer = mapDealer(row.dealer ?? null);
  const available = row.status === "available";
  return emptyVehicleDetail({
    id: row.id,
    source_type: "marketplace",
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    year: row.year,
    fuel: row.fuelType,
    transmission: row.transmission,
    price: toFiniteNumber(row.price),
    location: locationFrom(row.city, row.state, row.location),
    dealer,
    media: asStringArray(row.images),
    availability: row.status,
    purchasable: available && !!row.dealerId,
    slug: row.slug,
    title: row.title,
    body_type: row.bodyType,
    category: row.category,
    city: row.city,
    state: row.state,
    catalog_variant_id: row.catalogVariantId,
  });
}

type InventoryRow = {
  id: string;
  dealerId: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  fuelType: string | null;
  transmission: string | null;
  exShowroomPrice: unknown;
  onRoadPrice: unknown;
  price: unknown;
  stockStatus: string;
  stock: number;
  imageUrl: string | null;
  catalogVariantId: string | null;
};

export function mapDealerInventory(
  row: InventoryRow,
  dealer: VehicleDetailDealer | null,
): VehicleDetail {
  const inStock = row.stock > 0 && row.stockStatus !== "out_of_stock";
  const title = [row.brand, row.model, row.variant].filter(Boolean).join(" ");
  return emptyVehicleDetail({
    id: row.id,
    source_type: "dealer_inventory",
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    year: row.year,
    fuel: row.fuelType,
    transmission: row.transmission,
    price: toFiniteNumber(row.onRoadPrice) ?? toFiniteNumber(row.price) ?? toFiniteNumber(row.exShowroomPrice),
    location: dealer?.city ?? null,
    dealer,
    media: row.imageUrl ? [row.imageUrl] : [],
    availability: inStock ? row.stockStatus : "out_of_stock",
    purchasable: inStock && !!dealer,
    slug: null,
    title: title || null,
    category: "new-cars",
    city: dealer?.city ?? null,
    catalog_variant_id: row.catalogVariantId,
  });
}

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  fuelType: string;
  transmission: string;
  modelYear: number;
  exShowroomRef: unknown;
  status: string;
  model?: {
    name: string;
    bodyType: string | null;
    brand?: { name: string } | null;
  } | null;
  media?: { url: string; isPrimary: boolean }[];
};

export function mapCatalogVariant(row: CatalogRow): VehicleDetail {
  const brand = row.model?.brand?.name ?? null;
  const model = row.model?.name ?? null;
  const title = [brand, model, row.name].filter(Boolean).join(" ");
  const media = [...(row.media ?? [])]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((m) => m.url)
    .filter(Boolean);
  return emptyVehicleDetail({
    id: row.id,
    source_type: "catalog",
    brand,
    model,
    variant: row.name,
    year: row.modelYear,
    fuel: row.fuelType,
    transmission: row.transmission,
    price: toFiniteNumber(row.exShowroomRef),
    location: null,
    dealer: null,
    media,
    availability: row.status,
    purchasable: false,
    slug: row.slug,
    title: title || null,
    body_type: row.model?.bodyType ?? null,
    category: "new-cars",
    catalog_variant_id: row.id,
  });
}

/** Shape expected by the existing frontend mapDbToListing mapper. Missing values stay empty — never invented. */
export function toLegacyListingPayload(detail: VehicleDetail): {
  vehicle: Record<string, unknown>;
  dealer: Record<string, unknown> | null;
  specs: null;
} {
  const city = detail.city ?? "";
  const state = detail.state ?? "";
  return {
    vehicle: {
      id: detail.id,
      slug: detail.slug ?? detail.id,
      title: detail.title ?? [detail.brand, detail.model, detail.variant].filter(Boolean).join(" "),
      brand: detail.brand ?? "",
      model: detail.model ?? "",
      variant: detail.variant,
      year: detail.year ?? 0,
      price: detail.price ?? 0,
      original_price: null,
      fuel_type: detail.fuel ?? "",
      transmission: detail.transmission ?? "",
      body_type: detail.body_type ?? "",
      category: detail.category ?? "used-cars",
      kms_driven: 0,
      owners: 1,
      color: null,
      city,
      state,
      location: detail.location,
      images: detail.media,
      features: [],
      description: null,
      is_certified: false,
      is_featured: false,
      status:
        detail.source_type === "catalog"
          ? "draft"
          : detail.availability && ["draft", "available", "reserved", "sold"].includes(detail.availability)
            ? detail.availability
            : "available",
      condition: detail.source_type === "marketplace" ? "used" : "new",
      sale_mode: detail.source_type === "marketplace" ? "dealer_offer" : null,
      dealer_id: detail.dealer?.id ?? null,
      catalog_variant_id: detail.catalog_variant_id,
      created_at: null,
      metadata: {
        source_type: detail.source_type,
        purchasable: detail.purchasable,
        enquiry_allowed: detail.enquiry_allowed,
        availability: detail.availability,
        price_unknown: detail.price == null,
      },
    },
    dealer: detail.dealer
      ? {
          id: detail.dealer.id,
          name: detail.dealer.name,
          slug: detail.dealer.slug,
          city: detail.dealer.city,
          phone: detail.dealer.phone,
          is_verified: detail.dealer.is_verified,
        }
      : null,
    specs: null,
  };
}

/**
 * Resolve vehicle detail from marketplace, dealer new-car inventory, then catalog.
 * Catalog-only records are never purchasable.
 */
export async function getVehicleDetail(idOrSlug: string): Promise<VehicleDetail | null> {
  const key = idOrSlug.trim();
  if (!key) return null;

  const marketplace = await prisma.vehicle.findFirst({
    where: {
      deletedAt: null,
      OR: UUID_RE.test(key) ? [{ id: key }, { slug: key }] : [{ slug: key }],
    },
    include: {
      dealer: { select: { id: true, slug: true, name: true, city: true, phone: true, isVerified: true } },
    },
  });
  if (marketplace) return mapMarketplaceVehicle(marketplace);

  if (UUID_RE.test(key)) {
    const inventory = await prisma.newCarInventory.findUnique({ where: { id: key } });
    if (inventory) {
      const dealerRow = await prisma.dealer.findFirst({
        where: { id: inventory.dealerId, deletedAt: null },
        select: { id: true, slug: true, name: true, city: true, phone: true, isVerified: true },
      });
      return mapDealerInventory(inventory, mapDealer(dealerRow));
    }

    const variant = await prisma.catalogVariant.findUnique({
      where: { id: key },
      include: {
        model: { include: { brand: true } },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (variant) return mapCatalogVariant(variant);
  }

  return null;
}

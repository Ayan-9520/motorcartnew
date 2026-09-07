import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";

type Ctx = { params: Promise<{ slug: string }> };

function snakeDealer(d: {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  dealerType: string;
  rating: { toNumber?: () => number } | number;
  reviewCount: number;
  address: string | null;
  city: string;
  state: string;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isVerified: boolean;
  specialties: unknown;
  subscriptionTier: string;
  verificationStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const rating = Number(d.rating);
  return {
    id: d.id,
    owner_id: d.ownerId,
    name: d.name,
    slug: d.slug,
    logo_url: d.logoUrl,
    description: d.description,
    dealer_type: String(d.dealerType),
    rating,
    review_count: d.reviewCount,
    address: d.address,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    phone: d.phone,
    email: d.email,
    website: d.website,
    is_verified: d.isVerified,
    specialties: d.specialties,
    subscription_tier: d.subscriptionTier,
    verification_status: d.verificationStatus,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

/** Public dealer showroom — no auth. Includes marketplace vehicles + new-car stock. */
export async function GET(_req: NextRequest, context: Ctx) {
  try {
    const { slug } = await context.params;
    const normalized = decodeURIComponent(slug ?? "").trim().toLowerCase();
    if (!normalized) return err("slug required", 400);

    const dealer = await prisma.dealer.findFirst({
      where: { slug: normalized, deletedAt: null },
    });
    if (!dealer) return err("Dealer not found", 404);

    const [storefront, vehicles, inventory, reviews] = await Promise.all([
      prisma.dealerStorefront.findUnique({ where: { dealerId: dealer.id } }),
      prisma.vehicle.findMany({
        where: {
          dealerId: dealer.id,
          deletedAt: null,
          status: { in: ["available", "reserved"] },
        },
        orderBy: { createdAt: "desc" },
        take: 48,
      }),
      prisma.newCarInventory.findMany({
        where: {
          dealerId: dealer.id,
          stock: { gt: 0 },
          NOT: { stockStatus: { in: ["sold", "booked", "unavailable"] } },
        },
        orderBy: { updatedAt: "desc" },
        take: 48,
      }),
      prisma.review.findMany({
        where: { entityType: "dealer", entityId: dealer.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    type PublicVehicleRow = {
      id: string;
      slug: string;
      title: string;
      brand: string;
      model: string;
      year: number;
      price: number;
      images: unknown;
      status: string;
      is_certified: boolean;
      city: string;
      category: string;
      fuel_type: string;
      transmission: string;
      body_type: string;
      kms_driven: number;
      condition: string;
      dealer_id: string | null;
      created_at: string;
      metadata?: Record<string, unknown>;
    };

    const vehicleRows: PublicVehicleRow[] = vehicles.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      brand: v.brand,
      model: v.model,
      year: v.year,
      price: Number(v.price),
      images: v.images,
      status: String(v.status),
      is_certified: v.isCertified,
      city: v.city,
      category: v.category,
      fuel_type: v.fuelType,
      transmission: v.transmission,
      body_type: v.bodyType,
      kms_driven: v.kmsDriven,
      condition: v.condition,
      dealer_id: v.dealerId,
      created_at: v.createdAt.toISOString(),
    }));

    const inventoryRows: PublicVehicleRow[] = inventory.map((row) => {
      const price = Number(row.onRoadPrice ?? row.price ?? row.exShowroomPrice);
      const title = [row.brand, row.model, row.variant].filter(Boolean).join(" ");
      const slug = `ncd-${row.id.slice(0, 8)}`;
      return {
        id: row.id,
        slug,
        title,
        brand: row.brand,
        model: row.model,
        year: row.year,
        price,
        images: row.imageUrl ? [row.imageUrl] : [],
        status: "available",
        is_certified: true,
        city: dealer.city,
        category: "new-cars",
        fuel_type: row.fuelType ?? "petrol",
        transmission: row.transmission ?? "manual",
        body_type: "hatchback",
        kms_driven: 0,
        condition: "new",
        dealer_id: dealer.id,
        created_at: row.createdAt.toISOString(),
        metadata: {
          source: "new_car_inventory",
          ex_showroom_price: Number(row.exShowroomPrice),
          stock: row.stock,
        },
      };
    });

    // Prefer marketplace vehicles; append inventory rows not already mirrored by title+year
    const seen = new Set(vehicleRows.map((v) => `${v.brand}|${v.model}|${v.year}`.toLowerCase()));
    for (const row of inventoryRows) {
      const key = `${row.brand}|${row.model}|${row.year}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        vehicleRows.push(row);
      }
    }

    return ok({
      dealer: snakeDealer(dealer),
      storefront: storefront
        ? {
            dealer_id: storefront.dealerId,
            seo_title: storefront.seoTitle,
            seo_description: storefront.seoDescription,
            cover_url: storefront.coverUrl,
            hero_tagline: storefront.heroTagline,
            contact_whatsapp: storefront.contactWhatsapp,
            contact_phone: storefront.contactPhone,
          }
        : null,
      vehicles: vehicleRows,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.createdAt.toISOString(),
        user_id: r.userId,
      })),
    });
  } catch (e) {
    console.error("[dealers/slug]", e);
    return err("Failed to load showroom", 500);
  }
}

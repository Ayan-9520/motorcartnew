import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function collectPublicImages(
  imageUrl: string | null | undefined,
  meta: Record<string, unknown>,
  vehicleImages?: unknown,
): string[] {
  const out: string[] = [];
  const add = (raw: unknown) => {
    const t = String(raw ?? "").trim();
    if (!t) return;
    if (
      !(
        t.startsWith("http://") ||
        t.startsWith("https://") ||
        t.includes("/uploads/") ||
        t.startsWith("/media/") ||
        t.startsWith("/demo/")
      )
    ) {
      return;
    }
    if (!out.includes(t)) out.push(t);
  };
  if (Array.isArray(meta.images)) {
    for (const u of meta.images) add(u);
  }
  add(imageUrl);
  if (Array.isArray(vehicleImages)) {
    for (const u of vehicleImages) add(u);
  }
  // Per-colour photos stored on color_options
  const opts = Array.isArray(meta.color_options)
    ? meta.color_options
    : Array.isArray(meta.colorOptions)
      ? meta.colorOptions
      : [];
  for (const opt of opts) {
    if (!opt || typeof opt !== "object") continue;
    const imgs = (opt as { images?: unknown }).images;
    if (Array.isArray(imgs)) for (const u of imgs) add(u);
  }
  return out.slice(0, 12);
}

function buildColorOptions(
  meta: Record<string, unknown>,
  colors: string[],
  images: string[],
): Array<{ name: string; hex?: string; images: string[] }> | undefined {
  const raw = Array.isArray(meta.color_options)
    ? meta.color_options
    : Array.isArray(meta.colorOptions)
      ? meta.colorOptions
      : null;
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((item, i) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const name = String(o.name ?? o.color ?? o.colour ?? "").trim();
        if (!name) return null;
        const imgs = Array.isArray(o.images)
          ? (o.images as unknown[]).map((u) => String(u ?? "").trim()).filter(Boolean)
          : o.image_url || o.imageUrl || o.image
            ? [String(o.image_url ?? o.imageUrl ?? o.image)]
            : [];
        const fallback = imgs.length ? imgs : images[i] ? [images[i]!] : images[0] ? [images[0]] : [];
        const hexRaw = String(o.hex ?? "").trim();
        return {
          name,
          hex: hexRaw || undefined,
          images: fallback.slice(0, 8),
        };
      })
      .filter((x): x is { name: string; hex?: string; images: string[] } => Boolean(x));
  }
  if (!colors.length) return undefined;
  return colors.map((name, i) => ({
    name,
    images: images[i] ? [images[i]!] : images[0] ? [images[0]] : [],
  }));
}

/**
 * Public single new-car stock row by inventory UUID (accepts optional ncd- prefix).
 * Matches Buy hub visibility (available / transit / upcoming + recovered photo rows).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = String(raw ?? "")
    .trim()
    .replace(/^ncd-/i, "");
  if (!id) return err("id required", 400);

  const where: Prisma.NewCarInventoryWhereInput = {
    id,
    NOT: {
      OR: [
        { metadata: { path: ["archived"], equals: true } },
        { stockStatus: { in: ["delivered", "booked", "sold"] } },
      ],
    },
    OR: [
      { stockStatus: { in: ["available", "transit", "upcoming"] } },
      { stockStatus: "out_of_stock", OR: [{ imageUrl: { not: null } }, { stock: { gt: 0 } }] },
    ],
  };

  const row = await prisma.newCarInventory.findFirst({ where });
  if (!row) return err("Vehicle not found", 404);

  const d = await prisma.dealer.findFirst({
    where: { id: row.dealerId, deletedAt: null },
    select: { id: true, name: true, slug: true, city: true, state: true, pincode: true, isVerified: true },
  });

  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  const ex = Number(row.exShowroomPrice);
  const priceNum = row.price != null ? Number(row.price) : ex;
  const hasRealPrice = Number.isFinite(priceNum) && priceNum > 0;
  const priceOnRequest = Boolean(meta.price_on_request) || !hasRealPrice;

  let vehicleImages: unknown;
  const linkedVehicleId = typeof meta.vehicle_id === "string" ? meta.vehicle_id : null;
  if (linkedVehicleId) {
    const linked = await prisma.vehicle.findFirst({
      where: { id: linkedVehicleId, deletedAt: null },
      select: { images: true },
    });
    vehicleImages = linked?.images;
  }

  const images = collectPublicImages(row.imageUrl, meta, vehicleImages);
  const colors = Array.isArray(row.colors)
    ? (row.colors as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];
  const colorOptions = buildColorOptions(meta, colors, images);

  return ok({
    data: {
      id: row.id,
      brand: row.brand,
      model: row.model,
      variant: row.variant,
      year: row.year,
      fuel_type: row.fuelType,
      transmission: row.transmission,
      ex_showroom_price: hasRealPrice ? (ex > 0 ? ex : priceNum) : null,
      price: hasRealPrice ? priceNum : null,
      price_on_request: priceOnRequest,
      price_display: priceOnRequest ? "Price on request" : undefined,
      price_source_text: meta.price_source_text ? String(meta.price_source_text) : undefined,
      discount_amount: Number(row.discountAmount),
      stock: row.stock,
      stock_status: row.stockStatus,
      colors,
      color_options: colorOptions,
      image_url: images[0] ?? row.imageUrl,
      images,
      catalog_variant_id: row.catalogVariantId,
      on_road_price: row.onRoadPrice != null ? Number(row.onRoadPrice) : null,
      body_type: meta.body_type ? String(meta.body_type) : undefined,
      waiting_period_days: meta.waiting_period_days ? String(meta.waiting_period_days) : undefined,
      brochure_url: meta.brochure_url ? String(meta.brochure_url) : undefined,
      specifications:
        meta.specifications && typeof meta.specifications === "object" ? meta.specifications : undefined,
      features: Array.isArray(meta.features) ? meta.features : undefined,
      notes: meta.notes ? String(meta.notes) : undefined,
      vehicle_id: linkedVehicleId ?? undefined,
      dealer: d
        ? {
            id: d.id,
            name: d.name,
            slug: d.slug,
            city: d.city,
            state: d.state,
            pincode: d.pincode,
            is_verified: d.isVerified,
          }
        : null,
    },
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

/** List vehicles with category-aware image mapping */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const brand = sp.get("brand");
  const city = sp.get("city");
  const limit = Math.min(parseInt(sp.get("limit") ?? "24", 10), 100);
  const offset = parseInt(sp.get("offset") ?? "0", 10);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      status: "available",
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
      ...(city ? { city } : {}),
    },
    include: { specs: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const data = vehicles.map((v) => {
    const row = toSnakeRow(v as unknown as Record<string, unknown>);
    row.images = normalizeVehicleImages(v.category, v.brand, v.model, v.images);
    return row;
  });

  return ok({ data, total: data.length });
}

function normalizeVehicleImages(
  category: string,
  brand: string,
  model: string,
  images: unknown
): string[] {
  const list = Array.isArray(images) ? (images as string[]) : [];
  if (list.length && list.every((u) => matchesCategory(u, category))) return list;

  const slug = `${category}/${brand}/${model}`.toLowerCase().replace(/\s+/g, "-");
  return [`/media/vehicles/${slug}/01.webp`, ...list.filter((u) => matchesCategory(u, category))];
}

function matchesCategory(url: string, category: string): boolean {
  const c = category.toLowerCase();
  const u = url.toLowerCase();
  if (c.includes("bike")) return u.includes("bike") || u.includes("motorcycle");
  if (c.includes("truck")) return u.includes("truck");
  if (c.includes("bus")) return u.includes("bus");
  if (c.includes("ev")) return u.includes("ev") || u.includes("electric");
  if (c.includes("auto")) return u.includes("auto") || u.includes("rickshaw");
  return u.includes("car") || u.includes("sedan") || u.includes("suv") || !u.includes("bike");
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { serializeVehicle } from "@/lib/serialize-vehicle";

/** List vehicles with category-aware image mapping + dealer context for enquire. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const brand = sp.get("brand");
  const city = sp.get("city");
  const saleMode = sp.get("sale_mode") ?? sp.get("saleMode");
  const limit = Math.min(parseInt(sp.get("limit") ?? "24", 10), 100);
  const offset = parseInt(sp.get("offset") ?? "0", 10);

  const saleModeFilter =
    saleMode &&
    ["direct_owner", "broker_assisted", "dealer_offer", "auction_sale"].includes(saleMode)
      ? { saleMode: saleMode as "direct_owner" | "broker_assisted" | "dealer_offer" | "auction_sale" }
      : {};

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      status: "available",
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
      ...(city ? { city } : {}),
      ...saleModeFilter,
    },
    include: {
      specs: true,
      dealer: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const data = vehicles.map((v) => serializeVehicle(v));

  return ok({ data, total: data.length });
}

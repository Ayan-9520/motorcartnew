import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { listSellerProducts, upsertPartProduct } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listSellerProducts(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await upsertPartProduct(partnerActorFrom(req), {
      id: typeof body.id === "string" ? body.id : undefined,
      name: String(body.name ?? ""),
      sku: typeof body.sku === "string" ? body.sku : undefined,
      partNumber: typeof body.partNumber === "string" ? body.partNumber : undefined,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      manufacturer: typeof body.manufacturer === "string" ? body.manufacturer : undefined,
      classification: typeof body.classification === "string" ? body.classification : undefined,
      categorySlug: String(body.categorySlug ?? "general"),
      vehicleCategory: typeof body.vehicleCategory === "string" ? body.vehicleCategory : undefined,
      price: Number(body.price ?? 0),
      stock: body.stock != null ? Number(body.stock) : undefined,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

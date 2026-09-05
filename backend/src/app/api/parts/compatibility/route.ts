import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { addCompatibility } from "@/services/partner-industry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await addCompatibility(partnerActorFrom(req), String(body.partProductId ?? ""), {
      brand: String(body.brand ?? ""),
      model: String(body.model ?? ""),
      variant: typeof body.variant === "string" ? body.variant : undefined,
      yearFrom: body.yearFrom != null ? Number(body.yearFrom) : undefined,
      yearTo: body.yearTo != null ? Number(body.yearTo) : undefined,
      fuelType: typeof body.fuelType === "string" ? body.fuelType : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

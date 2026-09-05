import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import {
  cancelSaleRequest,
  createSaleRequest,
  listMySaleRequests,
  listOpenSaleRequests,
  submitSaleRequest,
} from "@/services/sale-request.service";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { requestIp } from "@/lib/http/request-meta";
import { SuperAppError } from "@/lib/superapp/errors";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const scope = req.nextUrl.searchParams.get("scope");
    if (scope === "open") return ok({ data: await listOpenSaleRequests(actor) });
    return ok({ data: await listMySaleRequests(actor) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`sell:post:${actor.userId}:${ip}`, 15, 15 * 60 * 1000)) {
      throw new SuperAppError("Too many sell requests. Please try again later.", 429, "RATE_LIMITED");
    }
    const body = (await req.json()) as Record<string, unknown>;
    if (body.action === "submit") return ok({ data: await submitSaleRequest(actor, String(body.id)) });
    if (body.action === "cancel") return ok({ data: await cancelSaleRequest(actor, String(body.id)) });
    return ok({
      data: await createSaleRequest(actor, {
        brand: String(body.brand ?? ""),
        model: String(body.model ?? ""),
        variant: body.variant ? String(body.variant) : undefined,
        year: Number(body.year),
        kmsDriven: Number(body.kmsDriven),
        owners: body.owners != null ? Number(body.owners) : undefined,
        fuelType: String(body.fuelType ?? "Petrol"),
        transmission: String(body.transmission ?? "Manual"),
        city: String(body.city ?? ""),
        state: String(body.state ?? ""),
        expectedPrice: body.expectedPrice != null ? Number(body.expectedPrice) : undefined,
        conditionNotes: body.conditionNotes ? String(body.conditionNotes) : undefined,
        customerVehicleId: body.customerVehicleId ? String(body.customerVehicleId) : undefined,
        vehicleId: body.vehicleId ? String(body.vehicleId) : undefined,
      }),
    });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

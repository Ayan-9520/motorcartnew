import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { getCustomer360, upsertCustomerPreferences } from "@/services/customer-360.service";

export async function GET(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const snap = await getCustomer360(actor);
    return ok({ data: snap.preferences });
  } catch (e) {
    return handleCustomerError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await upsertCustomerPreferences(actor, {
      dob: body.dob != null ? String(body.dob) : body.dob === null ? null : undefined,
      anniversary: body.anniversary != null ? String(body.anniversary) : body.anniversary === null ? null : undefined,
      preferredBrand: body.preferredBrand != null ? String(body.preferredBrand) : body.preferred_brand != null ? String(body.preferred_brand) : undefined,
      city: body.city != null ? String(body.city) : undefined,
      state: body.state != null ? String(body.state) : undefined,
      notifyInsurance: typeof body.notifyInsurance === "boolean" ? body.notifyInsurance : typeof body.notify_insurance === "boolean" ? body.notify_insurance : undefined,
      notifyService: typeof body.notifyService === "boolean" ? body.notifyService : typeof body.notify_service === "boolean" ? body.notify_service : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

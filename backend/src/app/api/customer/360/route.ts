import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { getCustomer360 } from "@/services/customer-360.service";

export async function GET(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const data = await getCustomer360(actor);
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

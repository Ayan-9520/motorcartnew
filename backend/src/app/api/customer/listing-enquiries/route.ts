import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { listOwnerListingEnquiries } from "@/lib/leads/enquiry.service";

export async function GET(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const data = await listOwnerListingEnquiries(actor.userId);
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

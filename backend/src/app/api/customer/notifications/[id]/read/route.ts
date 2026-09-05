import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { markCustomerNotificationRead } from "@/services/customer-360.service";

async function mark(req: NextRequest, id: string) {
  const actor = customerActorFrom(req);
  const data = await markCustomerNotificationRead(actor, id);
  return ok({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await mark(req, id);
  } catch (e) {
    return handleCustomerError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await mark(req, id);
  } catch (e) {
    return handleCustomerError(e);
  }
}

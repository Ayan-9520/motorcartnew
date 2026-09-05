import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { deleteCustomerVehicle, updateCustomerVehicle } from "@/services/customer-360.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = customerActorFrom(req);
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data = await updateCustomerVehicle(actor, id, {
      isPrimary: body.isPrimary === true || body.is_primary === true ? true : undefined,
      registrationNumber: body.registrationNumber != null ? String(body.registrationNumber) : body.registration_number != null ? String(body.registration_number) : undefined,
      odometerKm: body.odometerKm != null ? Number(body.odometerKm) : body.odometer_km != null ? Number(body.odometer_km) : undefined,
      fastagBalance: body.fastagBalance != null ? Number(body.fastagBalance) : body.fastag_balance != null ? Number(body.fastag_balance) : undefined,
      registrationCity: body.registrationCity != null ? String(body.registrationCity) : body.registration_city != null ? String(body.registration_city) : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = customerActorFrom(req);
    const { id } = await params;
    const data = await deleteCustomerVehicle(actor, id);
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

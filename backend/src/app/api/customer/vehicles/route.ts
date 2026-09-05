import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { customerActorFrom, handleCustomerError } from "@/lib/customer/http";
import { createCustomerVehicle, listCustomerVehicles } from "@/services/customer-360.service";

export async function GET(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const data = await listCustomerVehicles(actor);
    return ok({ data });
  } catch (e) {
    return handleCustomerError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = customerActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await createCustomerVehicle(actor, {
      brand: String(body.brand ?? ""),
      model: String(body.model ?? ""),
      year: Number(body.year),
      registrationNumber: body.registrationNumber != null ? String(body.registrationNumber) : body.registration_number != null ? String(body.registration_number) : undefined,
      segment: body.segment != null ? String(body.segment) : undefined,
      isPrimary: body.isPrimary === true || body.is_primary === true,
      fuelType: body.fuelType != null ? String(body.fuelType) : body.fuel_type != null ? String(body.fuel_type) : undefined,
      transmission: body.transmission != null ? String(body.transmission) : undefined,
      variant: body.variant != null ? String(body.variant) : undefined,
      registrationCity: body.registrationCity != null ? String(body.registrationCity) : body.registration_city != null ? String(body.registration_city) : undefined,
      purchaseDate: body.purchaseDate != null ? String(body.purchaseDate) : body.purchase_date != null ? String(body.purchase_date) : undefined,
      odometerKm: body.odometerKm != null ? Number(body.odometerKm) : body.odometer_km != null ? Number(body.odometer_km) : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleCustomerError(e);
  }
}

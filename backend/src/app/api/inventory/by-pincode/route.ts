import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleInventoryError } from "@/lib/inventory/http";
import { pincodeFromSearchParams } from "@/lib/inventory/pin";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";

/**
 * Public exact-PIN stock discovery.
 * Query: pincode only. Extra params (dealerId, organizationId, branchId) are ignored.
 * JWT is not required.
 */
export async function GET(req: NextRequest) {
  try {
    const pincode = pincodeFromSearchParams(req.nextUrl.searchParams);
    const result = await getInventoryByPincode(pincode);
    return ok(result);
  } catch (error) {
    return handleInventoryError(error);
  }
}

import type { BusinessCategory } from "@/auth/business-signup-types";
import type { AppRole } from "@/types/database";

/** Align stored role with business category when signup dropdown is generic. */
export function resolveBusinessSignupRole(role: AppRole, businessCategory: BusinessCategory): AppRole {
  if (businessCategory === "vehicle_broker") return "broker";
  if (businessCategory === "new_car_showroom") return "new_car_dealer";
  if (businessCategory === "preowned_lot" && role === "dealer") return "used_car_dealer";
  if (businessCategory === "parts_wholesale") return "parts_seller";
  if (businessCategory === "service_garage") return "service_center";
  if (businessCategory === "dsa_finance") return "dsa_agent";
  return role;
}

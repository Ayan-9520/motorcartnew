import { ok } from "@/lib/api-response";
import { INSURANCE_RATES_AS_OF, MOTOR_INSURERS } from "@/lib/insurance/insurance-engine";

export async function GET() {
  return ok({
    asOf: INSURANCE_RATES_AS_OF,
    data: MOTOR_INSURERS.map(({ odFactor: _od, addonFactor: _ad, ...pub }) => pub),
  });
}

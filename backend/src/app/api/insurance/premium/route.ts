import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { computeMarketQuotes, normalizeMotorQuoteInput, type MotorQuoteInput } from "@/lib/insurance/insurance-engine";

/** Indicative market premiums for a vehicle (public; same engine the web quote page uses). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<MotorQuoteInput> | null;
  const input = normalizeMotorQuoteInput(body);
  if (!input) return err("Invalid vehicle details");
  const { assessment, quotes } = computeMarketQuotes(input);
  return ok({ data: { input, assessment, quotes } });
}

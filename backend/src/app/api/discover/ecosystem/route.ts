import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError } from "@/lib/partneros/http";
import { searchEcosystem } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const data = await searchEcosystem(q);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { listPremiumListings } from "@/services/directory-monetization.service";

export async function GET(req: NextRequest) {
  const off = directoryMonetizationOffResponse();
  if (off) return off;

  const rows = await listPremiumListings(
    req.nextUrl.searchParams.get("limit")
      ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
      : 30
  );
  return ok({ data: rows });
}

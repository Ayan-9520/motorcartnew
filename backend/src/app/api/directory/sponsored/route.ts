import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { listSponsoredBusinesses } from "@/services/directory-monetization.service";

export async function GET(req: NextRequest) {
  const off = directoryMonetizationOffResponse();
  if (off) return off;

  const limit = req.nextUrl.searchParams.get("limit")
    ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
    : undefined;

  const rows = await listSponsoredBusinesses(limit);
  return ok({ data: rows });
}

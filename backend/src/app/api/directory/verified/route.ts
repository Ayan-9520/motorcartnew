import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { listVerifiedBadgeBusinesses } from "@/services/directory-monetization.service";

export async function GET(req: NextRequest) {
  const off = directoryMonetizationOffResponse();
  if (off) return off;

  const rows = await listVerifiedBadgeBusinesses(
    req.nextUrl.searchParams.get("limit")
      ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
      : 50
  );
  return ok({ data: rows });
}

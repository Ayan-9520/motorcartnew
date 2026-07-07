import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { categoryToEntityType } from "@/lib/directory/constants";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { listFeaturedBusinesses } from "@/services/directory-monetization.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const off = directoryMonetizationOffResponse();
  if (off) return off;

  const { category } = await params;
  if (!categoryToEntityType(category)) return err("Invalid category", 400);

  const limit = req.nextUrl.searchParams.get("limit")
    ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
    : 20;

  const rows = await listFeaturedBusinesses(category, limit);
  return ok({ data: rows, category });
}

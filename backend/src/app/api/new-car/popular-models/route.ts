import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getPopularNewCarModels } from "@/services/new-car-popularity.service";

/** Public: brand+model demand scores (leads, wishlists, quotations, test drives — last 120 days). */
export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 50, 1), 200);
  try {
    return ok({ data: await getPopularNewCarModels(limit) });
  } catch (e) {
    console.error("[new-car:popular-models]", e);
    return err("Could not load popular models", 500);
  }
}

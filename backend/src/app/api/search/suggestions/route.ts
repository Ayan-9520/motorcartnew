import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireUnifiedSearchPublic } from "@/lib/unified-search/guard";
import { searchSuggestions } from "@/services/unified-search.service";

export async function GET(req: NextRequest) {
  const gate = requireUnifiedSearchPublic();
  if ("response" in gate) return gate.response;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = req.nextUrl.searchParams.get("limit")
    ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
    : undefined;
  const data = await searchSuggestions(q, limit);
  return ok({ data });
}

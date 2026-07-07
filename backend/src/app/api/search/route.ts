import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireUnifiedSearchPublic } from "@/lib/unified-search/guard";
import { federatedSearch } from "@/services/unified-search.service";

export async function GET(req: NextRequest) {
  const gate = requireUnifiedSearchPublic();
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const data = await federatedSearch({
    q: sp.get("q") ?? "",
    category: sp.get("category") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    offset: sp.get("offset") ? parseInt(sp.get("offset")!, 10) : undefined,
  });
  return ok({ data });
}

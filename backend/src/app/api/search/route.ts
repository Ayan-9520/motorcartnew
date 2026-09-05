import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { requireUnifiedSearchPublic } from "@/lib/unified-search/guard";
import { federatedSearch } from "@/services/unified-search.service";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { requestIp } from "@/lib/http/request-meta";

export async function GET(req: NextRequest) {
  const gate = requireUnifiedSearchPublic();
  if ("response" in gate) return gate.response;

  const ip = requestIp(req);
  if (!allowSlidingWindow(`search:get:${ip}`, 60, 60 * 1000)) {
    return err("Too many search requests. Please try again later.", 429);
  }

  const sp = req.nextUrl.searchParams;
  const data = await federatedSearch({
    q: sp.get("q") ?? "",
    category: sp.get("category") ?? undefined,
    type: sp.get("type") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    offset: sp.get("offset") ? parseInt(sp.get("offset")!, 10) : undefined,
  });
  return ok({ data });
}

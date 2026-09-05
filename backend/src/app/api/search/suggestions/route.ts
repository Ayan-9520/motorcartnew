import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { requireUnifiedSearchPublic } from "@/lib/unified-search/guard";
import { searchSuggestions } from "@/services/unified-search.service";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { requestIp } from "@/lib/http/request-meta";

export async function GET(req: NextRequest) {
  const gate = requireUnifiedSearchPublic();
  if ("response" in gate) return gate.response;

  const ip = requestIp(req);
  if (!allowSlidingWindow(`search:suggest:${ip}`, 60, 60 * 1000)) {
    return err("Too many suggestion requests. Please try again later.", 429);
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = req.nextUrl.searchParams.get("limit")
    ? parseInt(req.nextUrl.searchParams.get("limit")!, 10)
    : undefined;
  const data = await searchSuggestions(q, limit);
  return ok({ data });
}

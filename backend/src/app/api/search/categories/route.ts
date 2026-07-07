import { ok } from "@/lib/api-response";
import { requireUnifiedSearchPublic } from "@/lib/unified-search/guard";
import { getSearchCategories } from "@/services/unified-search.service";

export async function GET() {
  const gate = requireUnifiedSearchPublic();
  if ("response" in gate) return gate.response;
  return ok({ data: getSearchCategories() });
}

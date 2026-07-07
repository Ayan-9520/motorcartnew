import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { categoryToEntityType } from "@/lib/directory/constants";
import { requireDirectoryPublic } from "@/lib/directory/guard";
import { searchDirectory } from "@/services/directory-profile.service";

export async function GET(req: NextRequest) {
  const gate = requireDirectoryPublic();
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const entityType = category ? categoryToEntityType(category) : null;

  const rows = await searchDirectory({
    q: searchParams.get("q") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    entityType: entityType ?? undefined,
    verified: searchParams.get("verified") === "true",
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
  });

  return ok({ data: rows });
}

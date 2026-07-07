import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { categoryToEntityType } from "@/lib/directory/constants";
import { requireDirectoryPublic } from "@/lib/directory/guard";
import { listDirectoryBusinesses } from "@/services/directory-profile.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const gate = requireDirectoryPublic();
  if ("response" in gate) return gate.response;

  const { category } = await params;
  const entityType = categoryToEntityType(category);
  if (!entityType) return err("Invalid category", 400);

  const { searchParams } = new URL(req.url);
  const rows = await listDirectoryBusinesses({
    entityType,
    q: searchParams.get("q") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    verified: searchParams.get("verified") === "true",
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
  });

  return ok({ data: rows, category });
}

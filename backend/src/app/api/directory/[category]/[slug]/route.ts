import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireDirectoryPublic } from "@/lib/directory/guard";
import { getDirectoryBusinessByCategorySlug } from "@/services/directory-profile.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string; slug: string }> }
) {
  const gate = requireDirectoryPublic();
  if ("response" in gate) return gate.response;

  const { category, slug } = await params;
  const auth = getAuthUser(req);
  const row = await getDirectoryBusinessByCategorySlug(category, slug, auth?.sub ?? null);
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}

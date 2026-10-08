import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { createPartReview, getCatalogPart, listPartReviews } from "@/lib/parts/parts-store.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const part = await getCatalogPart(slug);
    if (!part) return err("Part not found", 404);
    return ok({ data: await listPartReviews(part.id) });
  } catch (e) {
    console.error("[parts:reviews:list]", e);
    return err("Could not load reviews", 500);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await createPartReview(auth, slug, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data }, 201);
  } catch (e) {
    console.error("[parts:reviews:create]", e);
    return err("Could not save review", 500);
  }
}

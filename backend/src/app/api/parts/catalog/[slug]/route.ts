import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getCatalogPart } from "@/lib/parts/parts-store.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const data = await getCatalogPart(slug);
    if (!data) return err("Part not found", 404);
    return ok({ data });
  } catch (e) {
    console.error("[parts:catalog:detail]", e);
    return err("Could not load part", 500);
  }
}

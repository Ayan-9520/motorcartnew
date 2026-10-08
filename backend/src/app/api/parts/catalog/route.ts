import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { listCatalog } from "@/lib/parts/parts-store.service";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const data = await listCatalog({
      category: sp.get("category"),
      q: sp.get("q"),
      hub: sp.get("hub"),
      origin: sp.get("origin"),
      featured: sp.get("featured") === "true",
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    });
    return ok({ data });
  } catch (e) {
    console.error("[parts:catalog]", e);
    return err("Could not load parts", 500);
  }
}

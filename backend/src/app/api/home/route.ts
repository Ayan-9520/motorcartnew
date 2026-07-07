import { ok, err } from "@/lib/api-response";
import { getHomePageData } from "@/services/home-page.service";

export async function GET() {
  try {
    const data = await getHomePageData();
    return ok({ data });
  } catch (e) {
    console.error("[api/home]", e);
    return err(e instanceof Error ? e.message : "Failed to load homepage", 500);
  }
}

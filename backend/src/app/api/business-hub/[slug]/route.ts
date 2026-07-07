import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireUnifiedBusinessPublic } from "@/lib/ecosystem/guard";
import { getBusinessHubBySlug } from "@/services/business-hub.service";

/** Read-only business hub aggregate (M2.0) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = requireUnifiedBusinessPublic();
  if ("response" in gate) return gate.response;

  const { slug } = await params;
  const viewer = getAuthUser(req);
  const hub = await getBusinessHubBySlug(slug, viewer?.sub ?? null);
  if (!hub) return err("Business not found", 404);
  return ok({ data: hub });
}

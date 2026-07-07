import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { requireCommunityPublic } from "@/lib/community/guard";
import { getBusinessPageByEntity } from "@/services/community-business-page.service";

export async function GET(req: NextRequest) {
  const gate = requireCommunityPublic("businessPages");
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");
  if (!entityType || !entityId) {
    return err("entity_type and entity_id are required", 400);
  }

  const auth = getAuthUser(req);
  const page = await getBusinessPageByEntity(
    entityType,
    entityId,
    auth?.sub ?? null
  );
  if (!page) return err("Business page not found", 404);
  return ok({ data: page });
}

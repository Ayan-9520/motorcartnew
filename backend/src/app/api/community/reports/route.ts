import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireCommunityAuth } from "@/lib/community/guard";
import { createCommunityReport } from "@/services/community-engagement.service";
import { communityRateLimit, handleCommunityError } from "@/lib/community/http";

export async function POST(req: NextRequest) {
  const gate = await requireCommunityAuth(req, "posts");
  if ("response" in gate) return gate.response;
  const limited = communityRateLimit(req, gate.auth.sub, "report", 20);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const report = await createCommunityReport(gate.auth.sub, {
      target_type: body.target_type != null ? String(body.target_type) : undefined,
      target_id: body.target_id != null ? String(body.target_id) : undefined,
      reason: body.reason != null ? String(body.reason) : undefined,
      details: body.details != null ? String(body.details) : null,
    });
    return ok({ data: report }, 201);
  } catch (e) {
    return handleCommunityError(e);
  }
}

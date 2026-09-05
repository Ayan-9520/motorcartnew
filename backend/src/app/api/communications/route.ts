import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";

/**
 * Base index route for communications.
 * Sub-routes exist under:
 * - /api/communications/messages
 * - /api/communications/providers
 * - /api/communications/threads
 * - /api/communications/timeline
 * - /api/communications/webhooks/[provider]
 *
 * This index exists so anonymous calls do not hit 404 during launch readiness checks.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    return ok({ data: { available: true, role: actor.role } });
  } catch (e) {
    return handleCommosError(e);
  }
}


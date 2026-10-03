import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  INSURANCE_DESK_ROLES,
  createClaimRequest,
  listDeskClaimRequests,
  listMyClaimRequests,
} from "@/lib/insurance/insurance-desk.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (req.nextUrl.searchParams.get("scope") === "desk") {
    if (!INSURANCE_DESK_ROLES.has(auth.role)) return forbidden();
    return ok({ data: await listDeskClaimRequests(req.nextUrl.searchParams.get("status")) });
  }
  return ok({ data: await listMyClaimRequests(auth.sub) });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized("Sign in to intimate a claim");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await createClaimRequest(auth, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data }, 201);
  } catch (e) {
    console.error("[insurance:claim-requests:create]", e);
    return err("Could not submit claim", 500);
  }
}

import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  INSURANCE_DESK_ROLES,
  createInsuranceApplication,
  listDeskInsuranceApplications,
  listMyInsuranceApplications,
} from "@/lib/insurance/insurance-desk.service";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "desk") {
    if (!INSURANCE_DESK_ROLES.has(auth.role)) return forbidden();
    const data = await listDeskInsuranceApplications(req.nextUrl.searchParams.get("status"));
    return ok({ data });
  }
  return ok({ data: await listMyInsuranceApplications(auth.sub) });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized("Sign in to submit your insurance application");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await createInsuranceApplication(auth, body);
    if (!result.ok) return err(result.error, result.status ?? 400);
    return ok({ data: result.data }, 201);
  } catch (e) {
    console.error("[insurance:applications:create]", e);
    return err("Could not submit application", 500);
  }
}

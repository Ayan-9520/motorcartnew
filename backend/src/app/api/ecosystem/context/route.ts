import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireUnifiedIdentityAuth } from "@/lib/ecosystem/guard";
import { getEcosystemContext } from "@/services/ecosystem-context.service";

export async function GET(req: NextRequest) {
  const gate = await requireUnifiedIdentityAuth(req);
  if ("response" in gate) return gate.response;

  const data = await getEcosystemContext(gate.auth.sub);
  if (!data) return err("User not found", 404);
  return ok({ data });
}

import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { handleSuperAppError } from "@/lib/superapp/http";
import { requestIp } from "@/lib/customer/http";
import { verifyQrToken } from "@/services/motorcart-one.service";

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const data = await verifyQrToken(token, requestIp(req));
    return ok({ data });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST() {
  return err("Verification is read-only", 405);
}

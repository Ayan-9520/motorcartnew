import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { applyToJob } from "@/services/partner-industry.service";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import { requestIp } from "@/lib/http/request-meta";
import { PartnerOsError } from "@/lib/partneros/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ip = requestIp(req);
    if (!allowSlidingWindow(`jobs:apply:${ip}`, 10, 15 * 60 * 1000)) {
      throw new PartnerOsError("Too many applications. Please try again later.", 429, "RATE_LIMITED");
    }
    const body = await readJson(req).catch(() => ({} as Record<string, unknown>));
    const data = await applyToJob(
      partnerActorFrom(req),
      id,
      typeof body.coverNote === "string" ? body.coverNote : undefined,
    );
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

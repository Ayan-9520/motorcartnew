import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { addExperience, addSkill, publicProfessional } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const actor = partnerActorFrom(req);
    const data = await publicProfessional(actor.userId);
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = partnerActorFrom(req);
    const body = await readJson(req);
    if (typeof body.skill === "string") {
      const data = await addSkill(actor, body.skill);
      return ok({ data }, 201);
    }
    const data = await addExperience(actor, {
      title: String(body.title ?? ""),
      company: String(body.company ?? ""),
      startAt: String(body.startAt ?? ""),
      endAt: typeof body.endAt === "string" ? body.endAt : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

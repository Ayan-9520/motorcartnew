import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { commActorFrom, handleCommosError } from "@/lib/commos/http";
import { listProviders, upsertProvider } from "@/services/communication.service";

export async function GET(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const organizationId = req.nextUrl.searchParams.get("organizationId") ?? undefined;
    const data = await listProviders(actor, organizationId);
    return ok({ data });
  } catch (e) {
    return handleCommosError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = commActorFrom(req);
    const body = (await req.json()) as Record<string, unknown>;
    const data = await upsertProvider(actor, {
      id: typeof body.id === "string" ? body.id : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
      name: String(body.name ?? ""),
      channel: String(body.channel ?? ""),
      kind: String(body.kind ?? "generic"),
      secret: typeof body.secret === "string" ? body.secret : undefined,
      webhookSecret: typeof body.webhookSecret === "string" ? body.webhookSecret : undefined,
      senderId: typeof body.senderId === "string" ? body.senderId : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      credentialsRef: typeof body.credentialsRef === "string" ? body.credentialsRef : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handleCommosError(e);
  }
}

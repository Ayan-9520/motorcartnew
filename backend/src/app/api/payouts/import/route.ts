import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertCommercialOn, commercialActorFrom, handleCommercialError } from "@/lib/commercial/http";
import { confirmPayoutImport, previewPayoutImport } from "@/services/commercial-payout.service";

export async function POST(req: NextRequest) {
  try {
    assertCommercialOn();
    const actor = commercialActorFrom(req);
    const body = (await req.json()) as {
      action?: string;
      fileName?: string;
      content?: string;
      batchId?: string;
      organizationId?: string;
    };
    if (body.action === "confirm" && body.batchId) {
      return ok({ data: await confirmPayoutImport(actor, body.batchId, String(body.organizationId)) });
    }
    const data = await previewPayoutImport(actor, String(body.fileName ?? "upload.csv"), String(body.content ?? ""));
    return ok({ data });
  } catch (e) {
    return handleCommercialError(e);
  }
}

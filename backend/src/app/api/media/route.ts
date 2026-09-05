import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import { processMediaAsset, registerMediaAsset, reviewMediaAuthenticity, assertNotDocumentMime } from "@/services/vehicle-media.service";
import { SuperAppError } from "@/lib/superapp/errors";

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      const body = Object.fromEntries(form.entries());
      if (String(body.action) === "process") {
        return ok({ data: await processMediaAsset(actor, String(body.id)) });
      }
      if (String(body.action) === "review") {
        return ok({
          data: await reviewMediaAuthenticity(actor, String(body.id), String(body.status) as "REVIEWED" | "VERIFIED" | "REJECTED"),
        });
      }
      throw new SuperAppError("No file", 400, "NO_FILE");
    }
    assertNotDocumentMime(file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await registerMediaAsset(actor, {
      buffer,
      mimeType: file.type,
      mediaType: (String(form.get("mediaType") ?? "IMAGE") as "IMAGE" | "VIDEO" | "VIEW_360"),
      vehicleId: form.get("vehicleId") ? String(form.get("vehicleId")) : undefined,
      saleRequestId: form.get("saleRequestId") ? String(form.get("saleRequestId")) : undefined,
    });
    return ok({ data });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleDealerInventoryError, inventoryActorFrom, requireDealerInventoryRole } from "@/lib/dealer-inventory/http";
import { DealerInventoryError } from "@/lib/dealer-inventory/errors";
import { previewDealerInventoryImport } from "@/services/dealer-inventory.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const actor = inventoryActorFrom(req);
    requireDealerInventoryRole(actor);

    const contentType = req.headers.get("content-type") ?? "";
    let filename = "upload.csv";
    let content: Buffer;
    let mode: "create_only" | "create_update" = "create_only";
    let dealerId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new DealerInventoryError("File is required", 400, "FILE_REQUIRED");
      filename = file.name || filename;
      content = Buffer.from(await file.arrayBuffer());
      const modeRaw = String(form.get("mode") ?? "create_only");
      mode = modeRaw === "create_update" ? "create_update" : "create_only";
      dealerId = form.get("dealer_id") ? String(form.get("dealer_id")) : form.get("dealerId") ? String(form.get("dealerId")) : null;
    } else {
      const body = (await req.json()) as {
        filename?: string;
        contentBase64?: string;
        csv?: string;
        mode?: string;
        dealerId?: string;
        dealer_id?: string;
      };
      filename = body.filename ?? (body.csv ? "upload.csv" : "upload.xlsx");
      if (body.csv) content = Buffer.from(body.csv, "utf8");
      else if (body.contentBase64) content = Buffer.from(body.contentBase64, "base64");
      else throw new DealerInventoryError("File content required", 400, "FILE_REQUIRED");
      mode = body.mode === "create_update" ? "create_update" : "create_only";
      dealerId = body.dealer_id ?? body.dealerId ?? null;
    }

    const data = await previewDealerInventoryImport(actor, {
      filename,
      content,
      mode,
      dealerId,
    });
    return ok({ data });
  } catch (e) {
    return handleDealerInventoryError(e);
  }
}

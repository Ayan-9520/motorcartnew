import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";
import { isFinanceDocumentsApiEnabled } from "@/lib/finance/flags";
import { financeActorFrom, handleFinanceError } from "@/lib/finance/http";
import { toSnakeRow } from "@/lib/db/table-map";
import { addApplicationDocument } from "@/services/finance-marketplace.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Ctx) {
  if (!isFinanceDocumentsApiEnabled()) return err("Not found", 404);
  try {
    const actor = financeActorFrom(req);
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const doc = await addApplicationDocument(actor, id, {
      docType: body.docType ? String(body.docType) : body.doc_type ? String(body.doc_type) : undefined,
      fileName: String(body.fileName ?? body.file_name ?? ""),
      fileUrl: String(body.fileUrl ?? body.file_url ?? body.path ?? ""),
      status: body.status ? String(body.status) : undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
    });
    return ok({ data: toSnakeRow(doc as unknown as Record<string, unknown>) }, 201);
  } catch (e) {
    return handleFinanceError(e);
  }
}

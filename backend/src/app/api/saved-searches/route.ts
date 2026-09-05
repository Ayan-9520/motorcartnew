import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  runSavedSearch,
  updateSavedSearch,
} from "@/services/saved-search.service";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    return ok({ data: await listSavedSearches(actor) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const body = (await req.json()) as {
      name?: string;
      criteria?: Record<string, unknown>;
      notifyOnMatch?: boolean;
      id?: string;
      action?: string;
    };
    if (body.action === "run" && body.id) return ok({ data: await runSavedSearch(actor, body.id) });
    if (body.action === "update" && body.id) {
      return ok({
        data: await updateSavedSearch(actor, body.id, {
          name: body.name,
          criteria: body.criteria,
          notifyOnMatch: body.notifyOnMatch,
        }),
      });
    }
    if (body.action === "delete" && body.id) return ok({ data: await deleteSavedSearch(actor, body.id) });
    return ok({
      data: await createSavedSearch(actor, String(body.name), body.criteria ?? {}, Boolean(body.notifyOnMatch)),
    });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

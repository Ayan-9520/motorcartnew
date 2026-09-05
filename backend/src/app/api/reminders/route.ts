import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handleSuperAppError, superActorFrom } from "@/lib/superapp/http";
import {
  completeReminder,
  createCustomReminder,
  dismissReminder,
  listReminders,
  snoozeReminder,
  syncSystemReminders,
} from "@/services/reminder.service";

export async function GET(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    await syncSystemReminders(actor.userId);
    return ok({ data: await listReminders(actor) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = superActorFrom(req);
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      title?: string;
      dueAt?: string;
      until?: string;
    };
    if (body.action === "complete" && body.id) return ok({ data: await completeReminder(actor, body.id) });
    if (body.action === "dismiss" && body.id) return ok({ data: await dismissReminder(actor, body.id) });
    if (body.action === "snooze" && body.id) return ok({ data: await snoozeReminder(actor, body.id, String(body.until)) });
    return ok({ data: await createCustomReminder(actor, { title: String(body.title), dueAt: String(body.dueAt) }) });
  } catch (e) {
    return handleSuperAppError(e);
  }
}

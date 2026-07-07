import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthWorkspace } from "@/lib/growth/guard";
import {
  createSocialSchedule,
  listSocialSchedules,
} from "@/services/growth-social-scheduler.service";

export async function GET(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "socialScheduler");
  if ("response" in gate) return gate.response;

  const rows = await listSocialSchedules(gate.ctx.workspace.id);
  if (!rows) return err("Not found", 404);
  return ok({ data: rows });
}

export async function POST(req: NextRequest) {
  const gate = await requireGrowthWorkspace(req, "socialScheduler");
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    channel_id?: string;
    title?: string;
    body?: string;
    media_urls?: string[];
    scheduled_at?: string;
  };
  if (!body.channel_id || !body.title || !body.scheduled_at) {
    return err("channel_id, title, scheduled_at required", 400);
  }

  const row = await createSocialSchedule(gate.ctx.workspace.id, {
    channel_id: String(body.channel_id),
    title: String(body.title),
    body: body.body != null ? String(body.body) : "",
    media_urls: Array.isArray(body.media_urls) ? body.media_urls.map(String) : [],
    scheduled_at: String(body.scheduled_at),
  });
  if (!row) return err("Not found", 404);
  return ok({ data: row });
}

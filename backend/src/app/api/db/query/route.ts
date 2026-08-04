import { NextRequest } from "next/server";
import { runDbQuery, countDbQuery } from "@/lib/db/query-handler";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  isPendingBusinessAccess,
  isPendingBusinessDbAllowed,
  loadUserAccess,
} from "@/lib/auth/account-access";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";

const PUBLIC_TABLES = new Set([
  "vehicles",
  "dealers",
  "banks",
  "auctions",
  "service_centers",
  "part_products",
  "parts",
  "services",
  "cms_banners",
  "platform_banners",
  "insurance_partners",
  "subscription_plans",
  "community_groups",
  "social_posts",
]);

const DEV_WRITE_TABLES = new Set(["leads", "vehicles"]);

function paramsFromReq(req: NextRequest, body?: Record<string, unknown>) {
  const sp = req.nextUrl.searchParams;
  return {
    table: String(body?.table ?? sp.get("table") ?? ""),
    action: String(body?.action ?? sp.get("action") ?? "select"),
    filters: body?.filters ? String(body.filters) : sp.get("filters") ?? undefined,
    order: body?.order ? String(body.order) : sp.get("order") ?? undefined,
    limit: body?.limit ? String(body.limit) : sp.get("limit") ?? undefined,
    offset: body?.offset ? String(body.offset) : sp.get("offset") ?? undefined,
    single: body?.single ? String(body.single) : sp.get("single") ?? undefined,
    maybeSingle: body?.maybeSingle ? String(body.maybeSingle) : sp.get("maybeSingle") ?? undefined,
    onConflict: body?.onConflict ? String(body.onConflict) : sp.get("onConflict") ?? undefined,
    body: body?.body,
  };
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  return handle(req, body);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  return handle(req, body);
}

export async function DELETE(req: NextRequest) {
  return handle(req, { action: "delete", table: req.nextUrl.searchParams.get("table") });
}

async function handle(req: NextRequest, body?: Record<string, unknown>) {
  try {
    const p = paramsFromReq(req, body);
    if (!p.table) return err("table required");

    const auth = getAuthUser(req);
    const allowed =
      !!auth ||
      (p.action === "select" && PUBLIC_TABLES.has(p.table)) ||
      (p.action === "insert" && p.table === "leads") ||
      (process.env.NODE_ENV !== "production" &&
        DEV_WRITE_TABLES.has(p.table) &&
        (p.action === "insert" || p.action === "upsert"));
    if (!allowed) return unauthorized();

    if (auth) {
      const access = await loadUserAccess(auth.sub);
      if (access && isPendingBusinessAccess(access)) {
        const filters = body?.filters ?? req.nextUrl.searchParams.get("filters") ?? undefined;
        if (!isPendingBusinessDbAllowed(p.table, p.action, auth.sub, filters)) {
          return forbidden("Account pending admin approval. Workspace unlocks after approval.");
        }
      }
    }

    const countRequested = req.nextUrl.searchParams.get("count") === "exact" || (body as Record<string, string> | undefined)?.count === "exact";
    const data = await runDbQuery(p);
    if (countRequested && p.table) {
      const total = await countDbQuery(p.table, p.filters);
      return ok({ data, count: total });
    }
    return ok({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Query failed";
    if (msg === "PGRST116") return ok({ data: null }, 406);
    return err(msg, 500);
  }
}

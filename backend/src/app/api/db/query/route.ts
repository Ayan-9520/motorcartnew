import { NextRequest } from "next/server";
import { runDbQuery, countDbQuery } from "@/lib/db/query-handler";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  isPendingBusinessAccess,
  isPendingBusinessDbAllowed,
  loadUserAccess,
} from "@/lib/auth/account-access";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import {
  authorizeLegacyQuery,
  isNamedQueryOperation,
  sanitizeQueryError,
} from "@/lib/db/query-allowlist";
import { NamedQueryError, runNamedQuery } from "@/lib/db/query-registry";
import { KNOWN_QUERY_TABLES } from "@/lib/db/table-map";
import { EnquiryError } from "@/lib/leads/enquiry.service";

function paramsFromReq(req: NextRequest, body?: Record<string, unknown>) {
  const sp = req.nextUrl.searchParams;
  return {
    operation: String(body?.operation ?? sp.get("operation") ?? "").trim(),
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

function namedParams(req: NextRequest, body?: Record<string, unknown>): Record<string, unknown> {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  return { ...sp, ...(body ?? {}) };
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
    const jwt = getAuthUser(req);
    const auth = jwt ? { userId: jwt.sub, role: jwt.role } : null;

    if (p.operation) {
      if (!isNamedQueryOperation(p.operation)) {
        return err("Unknown operation", 400);
      }
      const data = await runNamedQuery(p.operation, {
        auth,
        params: namedParams(req, body),
      });
      return ok({ data, operation: p.operation });
    }

    if (!p.table) return err("table required");

    const decision = authorizeLegacyQuery(auth, { table: p.table, action: p.action, filters: p.filters }, KNOWN_QUERY_TABLES);
    if (!decision.ok) {
      if (decision.status === 401) return unauthorized(decision.message);
      if (decision.status === 403) return forbidden(decision.message);
      return err(decision.message, decision.status);
    }

    if (auth) {
      const access = await loadUserAccess(auth.userId);
      if (access && isPendingBusinessAccess(access)) {
        const filters = body?.filters ?? req.nextUrl.searchParams.get("filters") ?? undefined;
        if (!isPendingBusinessDbAllowed(p.table, p.action, auth.userId, filters)) {
          return forbidden("Account pending admin approval. Workspace unlocks after approval.");
        }
      }
    }

    const countRequested =
      req.nextUrl.searchParams.get("count") === "exact" ||
      (body as Record<string, string> | undefined)?.count === "exact";
    const data = await runDbQuery(p);
    if (countRequested && p.table) {
      const total = await countDbQuery(p.table, p.filters);
      return ok({ data, count: total });
    }
    return ok({ data });
  } catch (e) {
    if (e instanceof NamedQueryError) return err(e.message, e.status);
    if (e instanceof EnquiryError) return err(e.message, e.status);
    const sanitized = sanitizeQueryError(e);
    if (sanitized.status === 406) return ok({ data: null }, 406);
    return err(sanitized.message, sanitized.status);
  }
}

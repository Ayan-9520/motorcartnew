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
import {
  canMutateVehicle,
  extractIdEqFilter,
  isVehicleMutation,
  sanitizeSelfUserUpdate,
  sanitizeVehicleInsertBody,
  sanitizeVehicleUpdateBody,
} from "@/lib/db/vehicle-ownership";
import { EnquiryError } from "@/lib/leads/enquiry.service";
import { guardAuctionQuery, isAuctionTable, restrictPublicAuctionFilters } from "@/lib/auctions/auction-access";
import { AUCTION_ORGANIZER_ROLES, sweepAuctionStatuses } from "@/lib/auctions/auction-engine";
import { emitDbChange } from "@/lib/socket-emit";

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

    const isAdminAuth = !!auth && (auth.role === "admin" || auth.role === "super_admin");
    const action = p.action.trim().toLowerCase();

    if (auth && !isAdminAuth && p.table === "users" && (action === "update" || action === "patch")) {
      const safe = sanitizeSelfUserUpdate(p.body);
      if (!Object.keys(safe).length) return forbidden("Only profile fields can be updated");
      p.body = safe;
    }

    if (auth && !isAdminAuth && p.table === "vehicles" && (action === "insert" || action === "upsert")) {
      const safe = await sanitizeVehicleInsertBody(auth.userId, p.body);
      if (!safe) return forbidden("You can only list vehicles for your own dealership");
      p.body = safe;
    }

    if (auth && !isAdminAuth && isVehicleMutation(p.table, p.action)) {
      const vehicleId = extractIdEqFilter(p.filters);
      if (!vehicleId || !(await canMutateVehicle(auth.userId, vehicleId))) {
        return forbidden("You can only change your own listings");
      }
      if (action === "update" || action === "patch") {
        const safe = await sanitizeVehicleUpdateBody(auth.userId, p.body);
        if (safe === null) return forbidden("You can only move listings to your own dealership");
        p.body = safe;
      }
    }

    if (!isAdminAuth && p.table === "parts" && action !== "select") {
      return forbidden("Use /api/parts/seller/listings to manage parts");
    }

    if (auth && !isAdminAuth && isAuctionTable(p.table)) {
      const guard = await guardAuctionQuery(auth.userId, p.table, action, p.body, p.filters);
      if (!guard.ok) return forbidden(guard.message);
      if (guard.body !== undefined) p.body = guard.body as typeof p.body;
    }

    if (p.table === "auctions" && action === "select") {
      await sweepAuctionStatuses();
      if (!auth || !AUCTION_ORGANIZER_ROLES.has(auth.role)) {
        p.filters = restrictPublicAuctionFilters(p.filters);
      }
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
    if (p.table === "auction_messages" && action === "insert") {
      const rows = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
      for (const row of rows) if (row?.id) emitDbChange("auction_messages", "INSERT", { new: row });
    }
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

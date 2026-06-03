import type { Prisma } from "@prisma/client";
import { getDelegate, tableHasSoftDelete, toSnakeRow } from "./table-map";

type Filter = { column: string; op: string; value: unknown };

function camelColumn(col: string) {
  return col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function buildWhere(filters: Filter[], table: string): Record<string, unknown> {
  const where: Record<string, unknown> = tableHasSoftDelete(table) ? { deletedAt: null } : {};
  for (const f of filters) {
    const key = camelColumn(f.column);
    switch (f.op) {
      case "eq":
        where[key] = f.value;
        break;
      case "neq":
        where[key] = { not: f.value };
        break;
      case "in":
        where[key] = { in: f.value };
        break;
      case "gte":
        where[key] = { gte: f.value };
        break;
      case "lte":
        where[key] = { lte: f.value };
        break;
      case "ilike":
        where[key] = { contains: String(f.value).replace(/%/g, "") };
        break;
      case "is":
        where[key] = f.value;
        break;
      case "not.is":
        where[key] = null;
        break;
      case "not.eq":
        where[key] = { not: f.value };
        break;
      case "or":
        break;
    }
  }
  return where;
}

export async function runDbQuery(params: {
  table: string;
  action: string;
  filters?: string;
  order?: string;
  limit?: string;
  offset?: string;
  single?: string;
  maybeSingle?: string;
  onConflict?: string;
  body?: unknown;
}) {
  const delegate = getDelegate(params.table);
  if (!delegate) throw new Error(`Unknown table: ${params.table}`);

  const filters: Filter[] = params.filters ? JSON.parse(params.filters) : [];
  const where = buildWhere(filters, params.table);
  const order = params.order ? JSON.parse(params.order) : null;
  const take = params.limit ? parseInt(params.limit, 10) : undefined;
  const skip = params.offset ? parseInt(params.offset, 10) : undefined;

  const orderBy = order
    ? { [camelColumn(order.column)]: order.ascending ? "asc" : "desc" }
    : undefined;

  if (params.action === "select") {
    const rows = await delegate.findMany({
      where,
      orderBy,
      take,
      skip,
    });
    const mapped = (rows as Record<string, unknown>[]).map(toSnakeRow);
    if (params.single === "true" || params.maybeSingle === "true") {
      const one = mapped[0] ?? null;
      if (params.single === "true" && !one) throw new Error("PGRST116");
      return one;
    }
    return mapped;
  }

  if (params.action === "insert" || params.action === "upsert") {
    const raw = params.body as Record<string, unknown> | Record<string, unknown>[];
    const items = Array.isArray(raw) ? raw : [raw];
    const results: Record<string, unknown>[] = [];

    for (const item of items) {
      const data: Record<string, unknown> = {};
      const src = params.table === "analytics" ? mapAnalyticsInsert(item) : item;
      for (const [k, v] of Object.entries(src)) {
        data[camelColumn(k)] = v;
      }
      if (params.action === "upsert" && params.onConflict) {
        const key = camelColumn(params.onConflict);
        const row = await delegate.upsert({
          where: { [key]: data[key] },
          create: data,
          update: data,
        });
        results.push(toSnakeRow(row as Record<string, unknown>));
      } else {
        const row = await delegate.create({ data });
        results.push(toSnakeRow(row as Record<string, unknown>));
      }
    }
    return Array.isArray(raw) ? results : results[0];
  }

  if (params.action === "update") {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries((params.body ?? {}) as Record<string, unknown>)) {
      data[camelColumn(k)] = v;
    }
    const row = await delegate.update({ where: where as Prisma.Args<typeof delegate.update, "where">["where"], data });
    return toSnakeRow(row as Record<string, unknown>);
  }

  if (params.action === "delete") {
    await delegate.deleteMany({ where });
    return null;
  }

  throw new Error(`Unsupported action: ${params.action}`);
}

/** Maps legacy `analytics` table inserts to `activity_logs` */
function mapAnalyticsInsert(row: Record<string, unknown>): Record<string, unknown> {
  const payload = (row.payload as Record<string, unknown>) ?? {};
  return {
    userId: row.user_id ?? row.userId ?? null,
    action: String(row.event_type ?? payload.action ?? "analytics"),
    metadata: {
      ...payload,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      event_type: row.event_type,
    },
    ip: row.ip ?? null,
    userAgent: row.user_agent ?? null,
  };
}

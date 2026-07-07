import { api, apiErrorMessage } from "@/lib/api/axios";

type FilterOp = { column: string; op: string; value: unknown };

export class ApiQueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private columns = "*";
  private filters: FilterOp[] = [];
  private body: unknown = null;
  private _single = false;
  private _maybeSingle = false;
  private orderBy: { column: string; ascending: boolean; nullsFirst?: boolean } | null = null;
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private onConflict: string | null = null;
  private countMode: string | null = null;
  private headOnly = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.action = "select";
    this.columns = columns;
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.headOnly = true;
    return this;
  }

  insert(values: unknown) {
    this.action = "insert";
    this.body = values;
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.body = values;
    return this;
  }

  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.action = "upsert";
    this.body = values;
    this.onConflict = opts?.onConflict ?? null;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: "in", value: values });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: "is", value });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ column, op: `not.${op}`, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: "gte", value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: "lte", value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, op: "ilike", value });
    return this;
  }

  or(clause: string) {
    this.filters.push({ column: "_or", op: "or", value: clause });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderBy = { column, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  private buildParams() {
    const params: Record<string, string> = {
      table: this.table,
      select: this.columns,
      action: this.action,
    };
    if (this.filters.length) params.filters = JSON.stringify(this.filters);
    if (this.orderBy) params.order = JSON.stringify(this.orderBy);
    if (this.limitN != null) params.limit = String(this.limitN);
    if (this.rangeFrom != null) params.offset = String(this.rangeFrom);
    if (this.rangeTo != null && this.rangeFrom != null) {
      params.limit = String(this.rangeTo - this.rangeFrom + 1);
    }
    if (this._single) params.single = "true";
    if (this._maybeSingle) params.maybeSingle = "true";
    if (this.onConflict) params.onConflict = this.onConflict;
    if (this.countMode) params.count = this.countMode;
    if (this.headOnly) params.head = "true";
    return params;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async then(onfulfilled?: ((value: { data: any; error: { message: string; code?: string } | null; count?: number | null }) => unknown) | null, onrejected?: ((reason: unknown) => unknown) | null): Promise<unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: { data: any; error: null; count?: number | null };

      if (this.action === "select") {
        const { data } = await api.get<{ data: unknown; count?: number | null }>("/api/db/query", {
          params: this.buildParams(),
        });
        result = { data: data.data, error: null, count: data.count ?? null };
      } else if (this.action === "insert" || this.action === "upsert") {
        const { data } = await api.post<{ data: unknown }>("/api/db/query", {
          ...this.buildParams(),
          body: this.body,
        });
        result = { data: data.data, error: null };
      } else if (this.action === "update") {
        const { data } = await api.patch<{ data: unknown }>("/api/db/query", {
          ...this.buildParams(),
          body: this.body,
        });
        result = { data: data.data, error: null };
      } else {
        await api.delete("/api/db/query", { params: this.buildParams() });
        result = { data: null, error: null };
      }

      return onfulfilled ? onfulfilled(result) : result;
    } catch (err) {
      const error = {
        message: apiErrorMessage(err),
        code: (err as { response?: { status?: number } })?.response?.status === 406 ? "PGRST116" : undefined,
      };
      const result = { data: null, error };
      if (onrejected) return onrejected(err);
      return onfulfilled ? onfulfilled(result) : result;
    }
  }
}

export function fromTable<T = Record<string, unknown>>(table: string) {
  return new ApiQueryBuilder<T>(table);
}

export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
  try {
    const { data } = await api.post<{ data: T }>(`/api/db/rpc/${fn}`, args ?? {});
    return { data: data.data, error: null };
  } catch (err) {
    return { data: null, error: { message: apiErrorMessage(err) } };
  }
}

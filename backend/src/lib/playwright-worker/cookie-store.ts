export type BrowserCookie = {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

/** In-memory cookie jar keyed by domain. */
export class CookieStore {
  private readonly cookies = new Map<string, BrowserCookie[]>();

  set(domain: string, cookie: BrowserCookie): void {
    const key = normalizeDomain(domain);
    const list = this.cookies.get(key) ?? [];
    const idx = list.findIndex((c) => c.name === cookie.name && (c.path ?? "/") === (cookie.path ?? "/"));
    const next = { ...cookie, domain: key };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    this.cookies.set(key, list);
  }

  get(domain: string): BrowserCookie[] {
    return [...(this.cookies.get(normalizeDomain(domain)) ?? [])];
  }

  getAll(): BrowserCookie[] {
    return [...this.cookies.values()].flat();
  }

  clear(domain?: string): void {
    if (domain) this.cookies.delete(normalizeDomain(domain));
    else this.cookies.clear();
  }

  toHeader(domain: string): string {
    return this.get(domain)
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^\.+/, "");
}

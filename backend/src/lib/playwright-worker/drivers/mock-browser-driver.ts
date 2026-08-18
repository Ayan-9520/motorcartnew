import type {
  BrowserContextDriver,
  BrowserContextOptions,
  BrowserDriver,
  BrowserDriverFactory,
  BrowserLaunchOptions,
  NavigationOptions,
  PageDriver,
  ScreenshotOptions,
} from "../browser-types";
import type { BrowserCookie } from "../cookie-store";
import type { CapturedRequest, CapturedResponse } from "../worker-types";

const MOCK_PAGES = new Map<string, string>();

export function registerMockPage(path: string, html: string): void {
  MOCK_PAGES.set(normalizeMockPath(path), html);
}

export function clearMockPages(): void {
  MOCK_PAGES.clear();
}

function normalizeMockPath(path: string): string {
  return path.replace(/^mock:\/\//, "").replace(/^\//, "");
}

function defaultMockHtml(path: string): string {
  return `<!DOCTYPE html><html><head><title>Mock ${path}</title></head><body><h1>Mock Page</h1></body></html>`;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** In-memory browser driver — mock:// and about:blank only (no network). */
export class MockBrowserDriverFactory implements BrowserDriverFactory {
  async launch(_options?: BrowserLaunchOptions): Promise<BrowserDriver> {
    return new MockBrowserDriver(nextId("browser"));
  }
}

class MockBrowserDriver implements BrowserDriver {
  constructor(readonly id: string) {}

  async newContext(options?: BrowserContextOptions): Promise<BrowserContextDriver> {
    return new MockBrowserContextDriver(nextId("context"), options);
  }

  async close(): Promise<void> {
    /* no-op */
  }
}

class MockBrowserContextDriver implements BrowserContextDriver {
  private readonly cookies: BrowserCookie[];

  constructor(
    readonly id: string,
    private readonly options?: BrowserContextOptions,
  ) {
    this.cookies = [...(options?.cookies ?? [])];
  }

  async newPage(): Promise<PageDriver> {
    return new MockPageDriver(nextId("page"), this.options, this.cookies);
  }

  async addCookies(cookies: BrowserCookie[]): Promise<void> {
    this.cookies.push(...cookies);
  }

  async close(): Promise<void> {
    /* no-op */
  }
}

class MockPageDriver implements PageDriver {
  private html = "<!DOCTYPE html><html><body></body></html>";
  private currentUrl = "about:blank";
  private readonly requestListeners: Array<(request: CapturedRequest) => void> = [];
  private readonly responseListeners: Array<(response: CapturedResponse) => void> = [];

  constructor(
    readonly id: string,
    private readonly contextOptions?: BrowserContextOptions,
    private readonly cookies: BrowserCookie[] = [],
  ) {}

  onRequest(listener: (request: CapturedRequest) => void): void {
    this.requestListeners.push(listener);
  }

  onResponse(listener: (response: CapturedResponse) => void): void {
    this.responseListeners.push(listener);
  }

  async setExtraHTTPHeaders(_headers: Record<string, string>): Promise<void> {
    /* no-op for mock */
  }

  async goto(url: string, _options?: NavigationOptions): Promise<CapturedResponse | null> {
    assertAllowedMockUrl(url);
    const request: CapturedRequest = {
      url,
      method: "GET",
      headers: {
        "user-agent": this.contextOptions?.userAgent ?? "MockBrowser/1.0",
        cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.requestListeners) listener(request);

    this.currentUrl = url;
    if (url.startsWith("mock://")) {
      const path = normalizeMockPath(url);
      this.html = MOCK_PAGES.get(path) ?? defaultMockHtml(path);
    } else {
      this.html = "<!DOCTYPE html><html><body></body></html>";
    }

    const response: CapturedResponse = {
      url,
      status: 200,
      headers: { "content-type": "text/html" },
      timestamp: new Date().toISOString(),
    };
    for (const listener of this.responseListeners) listener(response);
    return response;
  }

  async content(): Promise<string> {
    return this.html;
  }

  async screenshot(_options?: ScreenshotOptions): Promise<Buffer> {
    const png = Buffer.alloc(32);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    return png;
  }

  async close(): Promise<void> {
    /* no-op */
  }
}

export function assertAllowedMockUrl(url: string): void {
  if (url === "about:blank") return;
  if (url.startsWith("mock://")) return;
  throw { code: "URL_NOT_ALLOWED", message: `External URLs are blocked in Phase 4C framework: ${url}`, retryable: false };
}

export function isHostAllowed(hostname: string, allowedHosts: readonly string[]): boolean {
  if (allowedHosts.length === 0) return true;
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase();
    return host === a || host.endsWith(`.${a}`);
  });
}

export function isAllowedFrameworkUrl(
  url: string,
  allowedSchemes: readonly string[],
  allowedHosts: readonly string[] = [],
): boolean {
  if (url === "about:blank") return allowedSchemes.includes("about");
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(":", "");
    if (!allowedSchemes.includes(scheme)) return false;
    if (scheme === "http" || scheme === "https") {
      return isHostAllowed(parsed.hostname, allowedHosts);
    }
    return true;
  } catch {
    return false;
  }
}

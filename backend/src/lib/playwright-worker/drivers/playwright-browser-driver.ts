/**
 * Real Playwright browser driver factory (Phase 4C — framework hook only).
 * Not used in unit tests. Requires `playwright` package and explicit external URL allow-list.
 */
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
import { isAllowedFrameworkUrl } from "./mock-browser-driver";

export type PlaywrightDriverOptions = {
  allowedUrlSchemes?: readonly string[];
  allowedHosts?: readonly string[];
};

export class PlaywrightBrowserDriverFactory implements BrowserDriverFactory {
  constructor(private readonly options: PlaywrightDriverOptions = {}) {}

  async launch(launchOptions?: BrowserLaunchOptions): Promise<BrowserDriver> {
    const playwright = await import("playwright");
    const browser = await playwright.chromium.launch({
      headless: launchOptions?.headless ?? true,
      proxy: launchOptions?.proxy
        ? {
            server: launchOptions.proxy.server,
            username: launchOptions.proxy.username,
            password: launchOptions.proxy.password,
            bypass: launchOptions.proxy.bypass?.join(","),
          }
        : undefined,
    });

    return new PlaywrightBrowserDriver(
      browser,
      this.options.allowedUrlSchemes ?? ["mock", "about"],
      this.options.allowedHosts ?? [],
    );
  }
}

class PlaywrightBrowserDriver implements BrowserDriver {
  constructor(
    private readonly browser: import("playwright").Browser,
    private readonly allowedSchemes: readonly string[],
    private readonly allowedHosts: readonly string[],
  ) {}

  get id(): string {
    return `pw-browser-${this.browser.contexts().length}`;
  }

  async newContext(options?: BrowserContextOptions): Promise<BrowserContextDriver> {
    const context = await this.browser.newContext({
      userAgent: options?.userAgent,
      viewport: options?.viewport,
      proxy: options?.proxy
        ? {
            server: options.proxy.server,
            username: options.proxy.username,
            password: options.proxy.password,
          }
        : undefined,
    });
    if (options?.cookies?.length) {
      await context.addCookies(
        options.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path ?? "/",
          expires: c.expires,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite,
        })),
      );
    }
    return new PlaywrightBrowserContextDriver(context, this.allowedSchemes, this.allowedHosts);
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}

class PlaywrightBrowserContextDriver implements BrowserContextDriver {
  constructor(
    private readonly context: import("playwright").BrowserContext,
    private readonly allowedSchemes: readonly string[],
    private readonly allowedHosts: readonly string[],
  ) {}

  get id(): string {
    return `pw-context-${this.context.pages().length}`;
  }

  async newPage(): Promise<PageDriver> {
    const page = await this.context.newPage();
    return new PlaywrightPageDriver(page, this.allowedSchemes, this.allowedHosts);
  }

  async addCookies(cookies: BrowserCookie[]): Promise<void> {
    await this.context.addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? "/",
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    );
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

class PlaywrightPageDriver implements PageDriver {
  private readonly requestListeners: Array<(request: CapturedRequest) => void> = [];
  private readonly responseListeners: Array<(response: CapturedResponse) => void> = [];

  constructor(
    private readonly page: import("playwright").Page,
    private readonly allowedSchemes: readonly string[],
    private readonly allowedHosts: readonly string[] = [],
  ) {
    this.page.on("request", (req) => {
      const captured: CapturedRequest = {
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        timestamp: new Date().toISOString(),
      };
      for (const listener of this.requestListeners) listener(captured);
    });
    this.page.on("response", (res) => {
      const captured: CapturedResponse = {
        url: res.url(),
        status: res.status(),
        headers: res.headers(),
        timestamp: new Date().toISOString(),
      };
      for (const listener of this.responseListeners) listener(captured);
    });
  }

  get id(): string {
    return `pw-page-${this.page.url()}`;
  }

  onRequest(listener: (request: CapturedRequest) => void): void {
    this.requestListeners.push(listener);
  }

  onResponse(listener: (response: CapturedResponse) => void): void {
    this.responseListeners.push(listener);
  }

  async setExtraHTTPHeaders(headers: Record<string, string>): Promise<void> {
    await this.page.setExtraHTTPHeaders(headers);
  }

  async goto(url: string, options?: NavigationOptions): Promise<CapturedResponse | null> {
    if (!isAllowedFrameworkUrl(url, this.allowedSchemes, this.allowedHosts)) {
      throw { code: "URL_NOT_ALLOWED", message: `External URL blocked: ${url}`, retryable: false };
    }
    const response = await this.page.goto(url, {
      timeout: options?.timeoutMs,
      waitUntil: options?.waitUntil ?? "domcontentloaded",
    });
    if (!response) return null;
    return {
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      timestamp: new Date().toISOString(),
    };
  }

  async content(): Promise<string> {
    return this.page.content();
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    const buf = await this.page.screenshot({ fullPage: options?.fullPage ?? false, type: "png" });
    return Buffer.from(buf);
  }

  async close(): Promise<void> {
    await this.page.close();
  }
}

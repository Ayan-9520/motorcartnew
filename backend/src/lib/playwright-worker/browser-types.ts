import type { CapturedRequest, CapturedResponse, ProxyConfig } from "./worker-types";
import type { BrowserCookie } from "./cookie-store";

export type NavigationOptions = {
  timeoutMs?: number;
  waitUntil?: "load" | "domcontentloaded" | "commit";
};

export type ScreenshotOptions = {
  fullPage?: boolean;
  type?: "png";
};

export type BrowserLaunchOptions = {
  headless?: boolean;
  proxy?: ProxyConfig | null;
};

export type BrowserContextOptions = {
  userAgent?: string;
  proxy?: ProxyConfig | null;
  cookies?: BrowserCookie[];
  viewport?: { width: number; height: number };
};

export interface PageDriver {
  readonly id: string;
  goto(url: string, options?: NavigationOptions): Promise<CapturedResponse | null>;
  content(): Promise<string>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  onRequest(listener: (request: CapturedRequest) => void): void;
  onResponse(listener: (response: CapturedResponse) => void): void;
  close(): Promise<void>;
}

export interface BrowserContextDriver {
  readonly id: string;
  newPage(): Promise<PageDriver>;
  addCookies(cookies: BrowserCookie[]): Promise<void>;
  close(): Promise<void>;
}

export interface BrowserDriver {
  readonly id: string;
  newContext(options?: BrowserContextOptions): Promise<BrowserContextDriver>;
  close(): Promise<void>;
}

export interface BrowserDriverFactory {
  launch(options?: BrowserLaunchOptions): Promise<BrowserDriver>;
}

export type PooledResource<T> = {
  resource: T;
  release: () => Promise<void>;
};

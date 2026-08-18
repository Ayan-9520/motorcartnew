/** Playwright worker framework types (Phase 4C — framework only). */

export type WorkerLogLevel = "debug" | "info" | "warn" | "error";

export type WorkerError = {
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
};

export type ProxyConfig = {
  server: string;
  username?: string;
  password?: string;
  bypass?: string[];
};

export type RandomDelayConfig = {
  minMs: number;
  maxMs: number;
};

export type RetryPolicyConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableCodes?: string[];
};

export type RateLimiterConfig = {
  maxConcurrent: number;
  minIntervalMs: number;
};

export type InterceptorPhase = "request" | "response";

export type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: string;
};

export type CapturedResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
};

export type HtmlSnapshot = {
  content: string;
  byteLength: number;
  capturedAt: string;
};

export type ScreenshotCapture = {
  buffer: Buffer;
  format: "png";
  byteLength: number;
  capturedAt: string;
};

export type WorkerTaskInput = {
  taskId: string;
  /** Framework tasks use mock:// or about:blank only — no external URLs in Phase 4C. */
  url: string;
  captureHtml?: boolean;
  captureScreenshot?: boolean;
  metadata?: Record<string, unknown>;
};

export type WorkerResult = {
  taskId: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  url: string;
  htmlSnapshot?: HtmlSnapshot;
  screenshot?: ScreenshotCapture;
  retries: number;
  requests: CapturedRequest[];
  responses: CapturedResponse[];
  errors: WorkerError[];
  metadata: Record<string, unknown>;
};

export type WorkerConfig = {
  browserPoolSize: number;
  contextPoolSize: number;
  maxPagesPerContext: number;
  defaultTimeoutMs: number;
  headless: boolean;
  retry: RetryPolicyConfig;
  rateLimit: RateLimiterConfig;
  randomDelay: RandomDelayConfig;
  userAgents: readonly string[];
  allowedUrlSchemes: readonly string[];
  /** When set, http(s) URLs must match one of these hosts (exact or subdomain). Empty = scheme-only. */
  allowedHosts: readonly string[];
  proxy?: ProxyConfig | null;
  captureScreenshotOnError: boolean;
};

export type WorkerStats = {
  browsersInPool: number;
  contextsInPool: number;
  activePages: number;
  tasksCompleted: number;
  tasksFailed: number;
};

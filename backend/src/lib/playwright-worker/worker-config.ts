import type { WorkerConfig } from "./worker-types";

export const DEFAULT_USER_AGENTS: readonly string[] = [
  "MotorcartPlaywrightWorker/1.0 (Framework; +https://motorcart.in/bot)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
] as const;

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  browserPoolSize: 2,
  contextPoolSize: 4,
  maxPagesPerContext: 2,
  defaultTimeoutMs: 30_000,
  headless: true,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 250,
    maxDelayMs: 5_000,
    backoffMultiplier: 2,
    retryableCodes: ["TIMEOUT", "POOL_EXHAUSTED", "NAVIGATION_FAILED"],
  },
  rateLimit: {
    maxConcurrent: 4,
    minIntervalMs: 50,
  },
  randomDelay: {
    minMs: 0,
    maxMs: 100,
  },
  userAgents: DEFAULT_USER_AGENTS,
  allowedUrlSchemes: ["mock", "about"],
  allowedHosts: [],
  proxy: null,
  captureScreenshotOnError: false,
};

export function mergeWorkerConfig(partial?: Partial<WorkerConfig>): WorkerConfig {
  if (!partial) return { ...DEFAULT_WORKER_CONFIG };
  return {
    ...DEFAULT_WORKER_CONFIG,
    ...partial,
    retry: { ...DEFAULT_WORKER_CONFIG.retry, ...partial.retry },
    rateLimit: { ...DEFAULT_WORKER_CONFIG.rateLimit, ...partial.rateLimit },
    randomDelay: { ...DEFAULT_WORKER_CONFIG.randomDelay, ...partial.randomDelay },
    userAgents: partial.userAgents ?? DEFAULT_WORKER_CONFIG.userAgents,
    allowedUrlSchemes: partial.allowedUrlSchemes ?? DEFAULT_WORKER_CONFIG.allowedUrlSchemes,
    allowedHosts: partial.allowedHosts ?? DEFAULT_WORKER_CONFIG.allowedHosts,
  };
}

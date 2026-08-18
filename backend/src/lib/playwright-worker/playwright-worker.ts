import type { BrowserDriverFactory } from "./browser-types";
import { BrowserManager } from "./browser-manager";
import { ContextManager } from "./context-manager";
import { CookieStore } from "./cookie-store";
import { HTMLSnapshotService, createHtmlSnapshotService } from "./html-snapshot-service";
import { InterceptorRegistry, blockExternalHostsInterceptor } from "./interceptors";
import { PageManager } from "./page-manager";
import type { ProxyProvider } from "./proxy-interface";
import { StaticProxyProvider } from "./proxy-interface";
import { RateLimiter } from "./rate-limiter";
import { RetryPolicy, normalizeWorkerError } from "./retry-policy";
import { ScreenshotService, createScreenshotService } from "./screenshot-service";
import { applyRandomDelay } from "./user-agent-rotation";
import { isAllowedFrameworkUrl } from "./drivers/mock-browser-driver";
import { mergeWorkerConfig } from "./worker-config";
import { createWorkerLogger, type WorkerLogger } from "./worker-logger";
import type {
  CapturedRequest,
  CapturedResponse,
  WorkerConfig,
  WorkerResult,
  WorkerStats,
  WorkerTaskInput,
} from "./worker-types";

export type PlaywrightWorkerOptions = {
  config?: Partial<WorkerConfig>;
  driverFactory: BrowserDriverFactory;
  proxyProvider?: ProxyProvider;
  logger?: WorkerLogger;
  htmlSnapshotService?: HTMLSnapshotService;
  screenshotService?: ScreenshotService;
};

/** Playwright worker orchestrator — framework only, no site-specific scraping (Phase 4C). */
export class PlaywrightWorker {
  private readonly config: WorkerConfig;
  private readonly logger: WorkerLogger;
  private readonly cookieStore = new CookieStore();
  private readonly retryPolicy: RetryPolicy;
  private readonly rateLimiter: RateLimiter;
  private readonly interceptors = new InterceptorRegistry();
  private readonly browserManager: BrowserManager;
  private readonly contextManager: ContextManager;
  private readonly pageManager: PageManager;
  private readonly htmlSnapshots: HTMLSnapshotService;
  private readonly screenshots: ScreenshotService;
  private tasksCompleted = 0;
  private tasksFailed = 0;
  private initialized = false;

  constructor(private readonly options: PlaywrightWorkerOptions) {
    this.config = mergeWorkerConfig(options.config);
    this.logger = options.logger ?? createWorkerLogger();
    this.retryPolicy = new RetryPolicy(this.config.retry);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.htmlSnapshots = options.htmlSnapshotService ?? createHtmlSnapshotService();
    this.screenshots = options.screenshotService ?? createScreenshotService();

    const proxyProvider = options.proxyProvider ?? new StaticProxyProvider(this.config.proxy ?? null);

    this.browserManager = new BrowserManager(
      options.driverFactory,
      this.config.browserPoolSize,
      { headless: this.config.headless, proxy: this.config.proxy ?? null },
      proxyProvider,
      this.logger,
    );

    this.contextManager = new ContextManager(
      this.config.contextPoolSize,
      this.config.maxPagesPerContext,
      this.config.userAgents,
      proxyProvider,
      this.cookieStore,
      this.logger,
    );

    this.pageManager = new PageManager(this.contextManager, this.config.defaultTimeoutMs, this.logger);

    this.interceptors.addRequest(
      blockExternalHostsInterceptor(this.config.allowedUrlSchemes, this.config.allowedHosts),
    );
  }

  get cookieJar(): CookieStore {
    return this.cookieStore;
  }

  get interceptorRegistry(): InterceptorRegistry {
    return this.interceptors;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.browserManager.initialize();
    this.initialized = true;
    this.logger.info("PlaywrightWorker initialized", {
      browserPoolSize: this.config.browserPoolSize,
      contextPoolSize: this.config.contextPoolSize,
    });
  }

  async shutdown(): Promise<void> {
    await this.contextManager.shutdown();
    await this.browserManager.shutdown();
    this.initialized = false;
    this.logger.info("PlaywrightWorker shut down");
  }

  getStats(): WorkerStats {
    return {
      browsersInPool: this.browserManager.size,
      contextsInPool: this.contextManager.size,
      activePages: this.pageManager.activeCount,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
    };
  }

  async runTask(task: WorkerTaskInput): Promise<WorkerResult> {
    await this.initialize();
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    this.logger.setTaskId?.(task.taskId);

    if (!isAllowedFrameworkUrl(task.url, this.config.allowedUrlSchemes, this.config.allowedHosts)) {
      return this.buildFailureResult(task, startedAt, startMs, 0, [
        { code: "URL_NOT_ALLOWED", message: `URL not allowed: ${task.url}`, retryable: false },
      ]);
    }

    const releaseRate = await this.rateLimiter.acquire();
    let retries = 0;

    try {
      await applyRandomDelay(this.config.randomDelay.minMs, this.config.randomDelay.maxMs);

      const execution = await this.retryPolicy.execute(
        () => this.executeTask(task),
        () => {
          retries += 1;
        },
      );

      retries = Math.max(0, execution.attempts - 1);
      this.tasksCompleted += 1;
      return { ...execution.value, retries };
    } catch (err) {
      this.tasksFailed += 1;
      const error = normalizeWorkerError(err);
      return this.buildFailureResult(task, startedAt, startMs, retries, [error], task.metadata);
    } finally {
      releaseRate();
      this.logger.setTaskId?.(undefined);
    }
  }

  async runTasks(tasks: WorkerTaskInput[]): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];
    for (const task of tasks) {
      results.push(await this.runTask(task));
    }
    return results;
  }

  private async executeTask(task: WorkerTaskInput): Promise<WorkerResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const requests: CapturedRequest[] = [];
    const responses: CapturedResponse[] = [];
    const errors: WorkerResult["errors"] = [];

    const browserLease = await this.browserManager.acquire();
    const contextLease = await this.contextManager.acquire(browserLease.resource);

    try {
      const result = await this.pageManager.withPage(contextLease.resource, async (page) => {
        page.onRequest((req) => {
          requests.push(req);
        });
        page.onResponse((res) => {
          responses.push(res);
        });

        const reqCtx = await this.interceptors.runRequest({ request: {
          url: task.url,
          method: "GET",
          headers: {},
          timestamp: new Date().toISOString(),
        }});
        if (reqCtx.abort) {
          throw { code: "REQUEST_BLOCKED", message: "Request blocked by interceptor", retryable: false };
        }

        const nav = await page.goto(task.url, { timeoutMs: this.config.defaultTimeoutMs });
        if (nav) {
          const resCtx = await this.interceptors.runResponse({
            request: reqCtx.request,
            response: nav,
          });
          if (resCtx.abort) {
            throw { code: "RESPONSE_BLOCKED", message: "Response blocked by interceptor", retryable: false };
          }
        }

        let htmlSnapshot;
        let screenshot;

        if (task.captureHtml !== false) {
          htmlSnapshot = await this.htmlSnapshots.capture(page);
        }
        if (task.captureScreenshot) {
          screenshot = await this.screenshots.capture(page);
        }

        const finishedAt = new Date().toISOString();
        return {
          taskId: task.taskId,
          success: true,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          url: task.url,
          htmlSnapshot,
          screenshot,
          retries: 0,
          requests,
          responses,
          errors,
          metadata: { ...(task.metadata ?? {}) },
        } satisfies WorkerResult;
      });

      await contextLease.release();
      await browserLease.release();
      return result;
    } catch (err) {
      await contextLease.release();
      await browserLease.release();
      throw err;
    }
  }

  private buildFailureResult(
    task: WorkerTaskInput,
    startedAt: string,
    startMs: number,
    retries: number,
    errors: WorkerResult["errors"],
    metadata?: Record<string, unknown>,
  ): WorkerResult {
    return {
      taskId: task.taskId,
      success: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      url: task.url,
      retries,
      requests: [],
      responses: [],
      errors,
      metadata: { ...(metadata ?? {}), ...(task.metadata ?? {}) },
    };
  }
}

export function createPlaywrightWorker(options: PlaywrightWorkerOptions): PlaywrightWorker {
  return new PlaywrightWorker(options);
}

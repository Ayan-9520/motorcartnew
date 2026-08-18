import type { BrowserContextDriver, BrowserContextOptions, BrowserDriver, PooledResource } from "./browser-types";
import type { BrowserCookie } from "./cookie-store";
import type { WorkerLogger } from "./worker-logger";
import type { ProxyProvider } from "./proxy-interface";
import { UserAgentRotator } from "./user-agent-rotation";

type ContextPoolEntry = {
  context: BrowserContextDriver;
  browserId: string;
  inUse: boolean;
  pageCount: number;
};

/** Pool of browser contexts with user-agent rotation and cookies. */
export class ContextManager {
  private readonly pool: ContextPoolEntry[] = [];
  private readonly waitQueue: Array<(entry: ContextPoolEntry) => void> = [];
  private readonly rotator: UserAgentRotator;

  constructor(
    private readonly poolSize: number,
    private readonly maxPagesPerContext: number,
    userAgents: readonly string[],
    private readonly proxyProvider: ProxyProvider | null,
    private readonly cookieStore: { getAll(): BrowserCookie[] },
    private readonly logger: WorkerLogger,
  ) {
    this.rotator = new UserAgentRotator([...userAgents]);
  }

  get size(): number {
    return this.pool.length;
  }

  get inUseCount(): number {
    return this.pool.filter((e) => e.inUse).length;
  }

  async acquire(browser: BrowserDriver): Promise<PooledResource<BrowserContextDriver>> {
    let entry = this.pool.find(
      (e) => !e.inUse && e.browserId === browser.id && e.pageCount < this.maxPagesPerContext,
    );

    if (!entry && this.pool.length < this.poolSize) {
      const context = await browser.newContext(await this.buildContextOptions());
      entry = { context, browserId: browser.id, inUse: false, pageCount: 0 };
      this.pool.push(entry);
      this.logger.debug("Browser context created", { contextId: context.id, browserId: browser.id });
    }

    if (!entry) {
      entry = await new Promise<ContextPoolEntry>((resolve) => this.waitQueue.push(resolve));
    }

    const acquired = entry;
    acquired.inUse = true;
    return {
      resource: acquired.context,
      release: async () => {
        acquired.inUse = false;
        const waiter = this.waitQueue.shift();
        if (waiter) waiter(acquired);
      },
    };
  }

  trackPageOpen(contextId: string): void {
    const entry = this.pool.find((e) => e.context.id === contextId);
    if (entry) entry.pageCount += 1;
  }

  trackPageClose(contextId: string): void {
    const entry = this.pool.find((e) => e.context.id === contextId);
    if (entry) entry.pageCount = Math.max(0, entry.pageCount - 1);
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.pool.map((e) => e.context.close()));
    this.pool.length = 0;
    this.logger.info("Context pool shut down");
  }

  private async buildContextOptions(): Promise<BrowserContextOptions> {
    const proxy = this.proxyProvider?.getProxy() ?? null;
    return {
      userAgent: this.rotator.next(),
      proxy,
      cookies: this.cookieStore.getAll(),
      viewport: { width: 1280, height: 720 },
    };
  }
}

import type { BrowserDriver, BrowserDriverFactory, BrowserLaunchOptions, PooledResource } from "./browser-types";
import type { WorkerLogger } from "./worker-logger";
import type { ProxyProvider } from "./proxy-interface";

type PoolEntry = {
  browser: BrowserDriver;
  inUse: boolean;
};

/** Pool of browser instances (launch once, reuse). */
export class BrowserManager {
  private readonly pool: PoolEntry[] = [];
  private readonly waitQueue: Array<(entry: PoolEntry) => void> = [];
  private launched = false;

  constructor(
    private readonly factory: BrowserDriverFactory,
    private readonly poolSize: number,
    private readonly launchOptions: BrowserLaunchOptions,
    private readonly proxyProvider: ProxyProvider | null,
    private readonly logger: WorkerLogger,
  ) {}

  get size(): number {
    return this.pool.length;
  }

  get inUseCount(): number {
    return this.pool.filter((e) => e.inUse).length;
  }

  async initialize(): Promise<void> {
    if (this.launched) return;
    this.launched = true;
    for (let i = 0; i < this.poolSize; i++) {
      const proxy = this.proxyProvider?.getProxy() ?? this.launchOptions.proxy ?? null;
      const browser = await this.factory.launch({ ...this.launchOptions, proxy });
      this.pool.push({ browser, inUse: false });
      this.logger.debug("Browser launched", { browserId: browser.id, index: i });
    }
  }

  async acquire(): Promise<PooledResource<BrowserDriver>> {
    await this.initialize();
    const entry = await this.takeEntry();
    entry.inUse = true;
    return {
      resource: entry.browser,
      release: async () => {
        entry.inUse = false;
        const waiter = this.waitQueue.shift();
        if (waiter) waiter(entry);
      },
    };
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.pool.map((e) => e.browser.close()));
    this.pool.length = 0;
    this.launched = false;
    this.logger.info("Browser pool shut down");
  }

  private takeEntry(): Promise<PoolEntry> {
    const free = this.pool.find((e) => !e.inUse);
    if (free) return Promise.resolve(free);
    return new Promise((resolve) => this.waitQueue.push(resolve));
  }
}

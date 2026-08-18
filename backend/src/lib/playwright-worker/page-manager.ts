import type { BrowserContextDriver, PageDriver, PooledResource } from "./browser-types";
import type { WorkerLogger } from "./worker-logger";
import type { ContextManager } from "./context-manager";

/** Manages page lifecycle within pooled browser contexts. */
export class PageManager {
  private activePages = 0;

  constructor(
    private readonly contextManager: ContextManager,
    private readonly defaultTimeoutMs: number,
    private readonly logger: WorkerLogger,
  ) {}

  get activeCount(): number {
    return this.activePages;
  }

  async withPage<T>(
    context: BrowserContextDriver,
    fn: (page: PageDriver) => Promise<T>,
  ): Promise<T> {
    const page = await context.newPage();
    this.activePages += 1;
    this.contextManager.trackPageOpen(context.id);
    this.logger.debug("Page opened", { pageId: page.id, contextId: context.id });

    try {
      return await fn(page);
    } finally {
      await page.close();
      this.contextManager.trackPageClose(context.id);
      this.activePages = Math.max(0, this.activePages - 1);
      this.logger.debug("Page closed", { pageId: page.id, contextId: context.id });
    }
  }

  getDefaultTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }
}

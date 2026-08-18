import type { RateLimiterConfig } from "./worker-types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simple concurrency + minimum interval rate limiter. */
export class RateLimiter {
  private active = 0;
  private queue: Array<() => void> = [];
  private lastAcquireAt = 0;

  constructor(private readonly config: RateLimiterConfig) {}

  get activeCount(): number {
    return this.active;
  }

  get queuedCount(): number {
    return this.queue.length;
  }

  async acquire(): Promise<() => void> {
    await this.waitForSlot();
    this.active += 1;

    const now = Date.now();
    const waitMs = Math.max(0, this.config.minIntervalMs - (now - this.lastAcquireAt));
    if (waitMs > 0) await sleep(waitMs);
    this.lastAcquireAt = Date.now();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
      const next = this.queue.shift();
      next?.();
    };
  }

  private waitForSlot(): Promise<void> {
    if (this.active < this.config.maxConcurrent) return Promise.resolve();
    return new Promise((resolve) => this.queue.push(resolve));
  }
}

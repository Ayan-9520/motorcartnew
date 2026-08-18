import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  PlaywrightWorker,
  RetryPolicy,
  RateLimiter,
  CookieStore,
  UserAgentRotator,
  RotatingProxyProvider,
  InterceptorRegistry,
  blockExternalHostsInterceptor,
  MockBrowserDriverFactory,
  registerMockPage,
  clearMockPages,
  createWorkerLogger,
  randomDelayMs,
  DEFAULT_WORKER_CONFIG,
} from "./index";

describe("RetryPolicy", () => {
  it("retries retryable errors with backoff", async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2 });
    let calls = 0;
    const result = await policy.execute(async () => {
      calls += 1;
      if (calls < 3) throw { code: "TIMEOUT", message: "timeout", retryable: true };
      return "ok";
    });
    assert.equal(result.value, "ok");
    assert.equal(result.attempts, 3);
  });

  it("does not retry non-retryable errors", async () => {
    const policy = new RetryPolicy(DEFAULT_WORKER_CONFIG.retry);
    await assert.rejects(
      () => policy.execute(async () => {
        throw { code: "URL_NOT_ALLOWED", message: "blocked", retryable: false };
      }),
      (err: { code: string }) => err.code === "URL_NOT_ALLOWED",
    );
  });
});

describe("RateLimiter", () => {
  it("limits concurrent acquisitions", async () => {
    const limiter = new RateLimiter({ maxConcurrent: 1, minIntervalMs: 0 });
    const release1 = await limiter.acquire();
    assert.equal(limiter.activeCount, 1);
    const pending = limiter.acquire();
    release1();
    const release2 = await pending;
    release2();
    assert.equal(limiter.activeCount, 0);
  });
});

describe("CookieStore", () => {
  it("stores and retrieves cookies by domain", () => {
    const store = new CookieStore();
    store.set("example.test", { name: "sid", value: "abc", domain: "example.test" });
    assert.equal(store.get("example.test").length, 1);
    assert.match(store.toHeader("example.test"), /sid=abc/);
  });
});

describe("UserAgentRotator", () => {
  it("rotates user agents round-robin", () => {
    const rotator = new UserAgentRotator(["ua-a", "ua-b"]);
    assert.equal(rotator.next(), "ua-a");
    assert.equal(rotator.next(), "ua-b");
    assert.equal(rotator.next(), "ua-a");
  });
});

describe("ProxyProvider", () => {
  it("rotates proxies", () => {
    const provider = new RotatingProxyProvider([
      { server: "http://proxy-a:8080" },
      { server: "http://proxy-b:8080" },
    ]);
    assert.equal(provider.getProxy()?.server, "http://proxy-a:8080");
    provider.rotate();
    assert.equal(provider.getProxy()?.server, "http://proxy-b:8080");
  });
});

describe("Interceptors", () => {
  it("blocks disallowed URL schemes", async () => {
    const registry = new InterceptorRegistry();
    registry.addRequest(blockExternalHostsInterceptor(["mock", "about"]));
    const blocked = await registry.runRequest({
      request: { url: "https://example.com", method: "GET", headers: {}, timestamp: new Date().toISOString() },
    });
    assert.equal(blocked.abort, true);
  });
});

describe("randomDelayMs", () => {
  it("returns value within bounds", () => {
    const ms = randomDelayMs(10, 20, () => 0.5);
    assert.ok(ms >= 10 && ms <= 20);
  });
});

describe("PlaywrightWorker (mock driver)", () => {
  beforeEach(() => {
    clearMockPages();
    registerMockPage("catalog/list", "<html><body><h1>List</h1></body></html>");
  });

  afterEach(() => {
    clearMockPages();
  });

  it("runs a mock task with HTML snapshot", async () => {
    const logger = createWorkerLogger();
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: { browserPoolSize: 1, contextPoolSize: 1, randomDelay: { minMs: 0, maxMs: 0 } },
      logger,
    });

    const result = await worker.runTask({
      taskId: "task-1",
      url: "mock://catalog/list",
      captureHtml: true,
      captureScreenshot: false,
    });

    assert.equal(result.success, true);
    assert.ok(result.htmlSnapshot?.content.includes("List"));
    assert.ok(result.requests.length >= 1);
    assert.ok(result.responses.some((r) => r.status === 200));
    await worker.shutdown();
  });

  it("captures screenshot when requested", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: { randomDelay: { minMs: 0, maxMs: 0 } },
    });

    const result = await worker.runTask({
      taskId: "task-shot",
      url: "mock://catalog/list",
      captureScreenshot: true,
      captureHtml: false,
    });

    assert.equal(result.success, true);
    assert.ok((result.screenshot?.buffer.byteLength ?? 0) > 0);
    assert.equal(result.screenshot?.format, "png");
    await worker.shutdown();
  });

  it("rejects external URLs", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: { randomDelay: { minMs: 0, maxMs: 0 } },
    });

    const result = await worker.runTask({
      taskId: "task-ext",
      url: "https://www.gaadibazaar.example/list",
    });

    assert.equal(result.success, false);
    assert.equal(result.errors[0]?.code, "URL_NOT_ALLOWED");
    await worker.shutdown();
  });

  it("pools browsers and contexts across tasks", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: {
        browserPoolSize: 1,
        contextPoolSize: 2,
        randomDelay: { minMs: 0, maxMs: 0 },
        rateLimit: { maxConcurrent: 2, minIntervalMs: 0 },
      },
    });

    await worker.initialize();
    const results = await worker.runTasks([
      { taskId: "a", url: "mock://catalog/list" },
      { taskId: "b", url: "about:blank" },
    ]);

    assert.equal(results.filter((r) => r.success).length, 2);
    const stats = worker.getStats();
    assert.equal(stats.browsersInPool, 1);
    assert.ok(stats.tasksCompleted >= 2);
    await worker.shutdown();
  });

  it("stores cookies on shared cookie jar", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: { randomDelay: { minMs: 0, maxMs: 0 } },
    });
    worker.cookieJar.set("mock.local", { name: "session", value: "xyz", domain: "mock.local" });
    assert.equal(worker.cookieJar.getAll().length, 1);
    await worker.shutdown();
  });
});

describe("no external network", () => {
  it("mock driver never opens HTTP connections", async () => {
    const worker = new PlaywrightWorker({
      driverFactory: new MockBrowserDriverFactory(),
      config: { randomDelay: { minMs: 0, maxMs: 0 } },
    });
    const result = await worker.runTask({ taskId: "local", url: "about:blank" });
    assert.equal(result.success, true);
    assert.ok(result.requests.every((r) => r.url.startsWith("about:") || r.url.startsWith("mock:")));
    await worker.shutdown();
  });
});

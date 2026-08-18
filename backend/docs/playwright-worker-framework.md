# Playwright Worker Framework (Phase 4C)

Production-grade browser worker framework for future catalog scraping. **Framework only** — no selectors, no site scraping, no GaadiBazaar calls, no external URLs in tests.

## Location

```
backend/src/lib/playwright-worker/
├── worker-types.ts          WorkerConfig, WorkerResult, WorkerTaskInput
├── worker-config.ts         Defaults + mergeWorkerConfig
├── worker-logger.ts         WorkerLogger, InMemoryWorkerLogger
├── retry-policy.ts          RetryPolicy
├── rate-limiter.ts          RateLimiter
├── cookie-store.ts          CookieStore
├── proxy-interface.ts       ProxyProvider, StaticProxyProvider, RotatingProxyProvider
├── user-agent-rotation.ts   UserAgentRotator, randomDelayMs
├── interceptors.ts          Request/response interceptors
├── browser-types.ts         Driver interfaces (Browser, Context, Page)
├── browser-manager.ts       Browser pool
├── context-manager.ts       Context pool + UA rotation
├── page-manager.ts          Page lifecycle
├── screenshot-service.ts    ScreenshotService
├── html-snapshot-service.ts HTMLSnapshotService
├── playwright-worker.ts     PlaywrightWorker orchestrator
├── drivers/
│   ├── mock-browser-driver.ts       In-memory (mock://, about:blank)
│   └── playwright-browser-driver.ts   Real Playwright hook (URL allow-list)
├── playwright-worker.test.ts
└── index.ts
```

## Architecture

```mermaid
flowchart TB
  subgraph Worker
    PW[PlaywrightWorker]
    RP[RetryPolicy]
    RL[RateLimiter]
    LG[WorkerLogger]
    IC[InterceptorRegistry]
    CS[CookieStore]
  end

  subgraph Pools
    BM[BrowserManager]
    CM[ContextManager]
    PM[PageManager]
  end

  subgraph Capture
    HS[HTMLSnapshotService]
    SS[ScreenshotService]
  end

  subgraph Drivers
    MF[MockBrowserDriverFactory]
    PF[PlaywrightBrowserDriverFactory]
  end

  PW --> RP
  PW --> RL
  PW --> LG
  PW --> IC
  PW --> CS
  PW --> BM
  PW --> CM
  PW --> PM
  PM --> HS
  PM --> SS
  BM --> MF
  BM --> PF
  CM --> BM
```

## Class diagram

```mermaid
classDiagram
  class PlaywrightWorker {
    +runTask(task) WorkerResult
    +runTasks(tasks) WorkerResult[]
    +initialize()
    +shutdown()
    +getStats() WorkerStats
    +cookieJar CookieStore
  }

  class BrowserManager {
    +acquire() PooledResource
    +shutdown()
  }

  class ContextManager {
    +acquire(browser) PooledResource
    +shutdown()
  }

  class PageManager {
    +withPage(context, fn)
  }

  class RetryPolicy {
    +execute(fn)
  }

  class RateLimiter {
    +acquire()
  }

  PlaywrightWorker --> BrowserManager
  PlaywrightWorker --> ContextManager
  PlaywrightWorker --> PageManager
  PlaywrightWorker --> RetryPolicy
  PlaywrightWorker --> RateLimiter
  BrowserManager --> BrowserDriverFactory
  ContextManager --> UserAgentRotator
  ContextManager --> CookieStore
```

## Sequence diagram (task execution)

```mermaid
sequenceDiagram
  participant Client
  participant PW as PlaywrightWorker
  participant RL as RateLimiter
  participant RP as RetryPolicy
  participant BM as BrowserManager
  participant CM as ContextManager
  participant PM as PageManager
  participant IC as Interceptors
  participant Cap as HTML/Screenshot

  Client->>PW: runTask(mock://page)
  PW->>RL: acquire()
  PW->>RP: execute()
  RP->>BM: acquire browser
  BM->>CM: acquire context
  CM->>PM: withPage()
  PM->>IC: runRequest()
  PM->>PM: page.goto(mock://)
  PM->>IC: runResponse()
  PM->>Cap: capture HTML / screenshot
  PM-->>PW: WorkerResult
  PW->>RL: release()
  PW-->>Client: success
```

## Features

| Feature | Component |
|---------|-----------|
| Browser pool | `BrowserManager` |
| Context pool | `ContextManager` |
| Retry + backoff | `RetryPolicy` |
| Timeout | `WorkerConfig.defaultTimeoutMs` + page `goto` |
| Random delay | `applyRandomDelay` |
| User-agent rotation | `UserAgentRotator` |
| Proxy interface | `ProxyProvider` |
| Cookie store | `CookieStore` |
| Request interceptor | `InterceptorRegistry` |
| Response interceptor | `InterceptorRegistry` |
| HTML capture | `HTMLSnapshotService` |
| Screenshot capture | `ScreenshotService` |
| Structured logging | `WorkerLogger` |

## Usage (mock driver — Phase 4C)

```typescript
import {
  createPlaywrightWorker,
  MockBrowserDriverFactory,
  registerMockPage,
} from "@/lib/playwright-worker";

registerMockPage("catalog/list", "<html><body>List</body></html>");

const worker = createPlaywrightWorker({
  driverFactory: new MockBrowserDriverFactory(),
  config: { randomDelay: { minMs: 0, maxMs: 0 } },
});

const result = await worker.runTask({
  taskId: "demo-1",
  url: "mock://catalog/list",
  captureHtml: true,
  captureScreenshot: true,
});

await worker.shutdown();
```

## URL policy

Phase 4C allows **`mock://`** and **`about:blank`** only (configurable via `WorkerConfig.allowedUrlSchemes`). External URLs are rejected before navigation.

## Scripts

```bash
npm run test:playwright-worker
npm run benchmark:playwright-worker
```

## Out of scope (Phase 4C)

- CSS/XPath selectors
- GaadiBazaar or any live site scraping
- Source adapter wiring
- Import pipeline integration
- Database writes

## Next phase

Implement site-specific scraper modules that produce in-memory payloads and call existing import adapters — **not** part of Phase 4C.

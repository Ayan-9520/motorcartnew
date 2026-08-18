# GaadiBazaar Controlled Live Dry-Run (Phase 5F)

Controlled production-readiness test against **real** GaadiBazaar. Reuses existing Playwright Worker, POM, scraper, adapter, and catalog import pipeline.

## Hard limits

| Setting | Value |
|---------|-------|
| Source | GaadiBazaar |
| City | Delhi (`new-delhi`) |
| Search | Maruti Suzuki |
| Max pages | 1 |
| Max records | 100 |
| Mode | **DRY-RUN** (no catalog write, no publish, no production media upload) |

## Run

```powershell
cd backend
npm run catalog:gaadi-bazaar:live-dry-run
```

Requires:

- `playwright` package + Chromium (`npx playwright install chromium`)
- Outbound HTTPS to `www.gaadibazaar.in`
- robots.txt allow (fail closed)

## Behavior

1. robots.txt gate
2. `PlaywrightBrowserDriver` with host allow-list (`www.gaadibazaar.in`, `gaadibazaar.in`)
3. Existing rate limiter / retry / timeout / HTML snapshot / screenshot-on-nav
4. Live HTML normalized into existing `data-gb` POM shape (no parallel scraper)
5. Import pipeline dry-run (validation → duplicate → matching skip unless catalog variants provided)
6. Quality reports under `reports/catalog-import-live/` (CSV + JSON + HTML)

## Stop conditions (no bypass)

If CAPTCHA, Cloudflare challenge, login wall, access denied, robots disallow, or selectors yield zero cards after protection:

- Job stops
- Exact error code/message returned
- No bulk scrape, no publish

## Job input flag

```ts
await runCatalogImportJob({
  source: "gaadi_bazaar",
  city: "Delhi",
  search: "Maruti Suzuki",
  pages: 1,
  maxVehicles: 100,
  useRealBrowser: true, // Phase 5F only
});
```

Admin start API does **not** enable live scrape by default (script-only for controlled test).

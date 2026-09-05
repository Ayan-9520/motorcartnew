# Launch readiness (Batch 12)

**Software status:** ready for configuration — not a live-provider launch until credentials and dealer data exist.

## Feature flags (meaningful)

| Flag | Default | Side | Provider | Entitlement | Production |
|------|---------|------|----------|-------------|------------|
| FEATURE_FULL_ECOSYSTEM | prod true / local false | both | — | — | optional umbrella |
| FEATURE_M5_UNIFIED_SEARCH | true | both | none | none | ON |
| FEATURE_M4_NOTIFICATIONS | true | both | none | none | ON |
| FEATURE_FINANCE_MARKETPLACE | true | both | none for catalog | org | ON |
| FEATURE_SALES_OS | true | backend | — | — | ON |
| FEATURE_LEAD_BOARD | false | both | — | paid_leads / board | OFF until policy |
| FEATURE_PAID_LEADS | false | both | payment optional | yes | OFF |
| FEATURE_COMMERCIAL_ENGINE | true | backend | — | — | ON |
| FEATURE_PAYMENT_GATEWAY | false | backend | payment adapter | — | OFF |
| FEATURE_COMMUNICATIONS | true | backend | WhatsApp/SMS/email | policy | ON abstraction |
| FEATURE_DIALER | false | backend | telephony | plan | OFF |
| FEATURE_AI_CALLING | false | backend | AI + telephony | plan | OFF |
| FEATURE_ORGANIZATION_LAYER | true | backend | — | — | ON |
| FEATURE_CATALOG_* | false | backend | — | — | OFF until catalog go-live |
| OPENAI_API_KEY | empty | backend | OpenAI | AI plan | unset = honest fallback |
| VITE_* | flags only | frontend | **never secrets** | — | no JWT/DB keys |

## Environment (no real secrets in examples)

Required: `DATABASE_URL`, JWT secrets (≥32 chars), `CORS_ORIGIN` / `FRONTEND_URL`.  
Optional: `REDIS_URL` (degrade if unused), `UPLOAD_DIR` / future object storage, `COMM_WEBHOOK_SECRET`, `COMMERCIAL_WEBHOOK_SECRET`, `OPENAI_API_KEY`, SMTP.

## Deployment checklist (do not deploy from this batch)

- [ ] Frontend `npx tsc -b` + `npx vite build`
- [ ] Backend `npx tsc --noEmit` + `npx next build` (sequential, not parallel with another Next build)
- [ ] `prisma migrate deploy` on **that** environment’s DB after backup
- [ ] `/api/health` 200, `/api/ready` database true
- [ ] CORS + cookie/JWT settings for HTTPS
- [ ] Webhook URLs only if secrets set
- [ ] Scheduler wired for `runSuperAppJobs` if super-app notifications are required
- [ ] Payment flag remains false without a live adapter

## Launch classification

| Class | Items |
|-------|--------|
| P0 software | None identified after Batch 12 closures |
| P1 | Sitemap/SEO polish; remaining ERP admin shells; Lead Board coverage vs org coverage; VIN live match; a11y pass on long-tail pages |
| PROVIDER_REQUIRED | WhatsApp, SMS, email, telephony, AI key, payment gateway, bureau/LOS |
| DATA_REQUIRED | Dealer stock, jobs, parts SKUs, partner products |
| BUSINESS_CONFIG_REQUIRED | GSTIN/tax settings, plans, webhook secrets, production JWT, CORS |
| FUTURE | OpenSearch, Kafka, K8s, warehouse, ML recs, FASTag, MotorCart One payments |

## Architecture confirmation

One User, Dealer, Organization tenant, Lead, Customer identity, Community, CRM/Sales OS, commercial ledger, rewards ledger, notification stack, communication provider architecture, MotorCart One. No duplicate finance/insurance/parts/service/jobs/ERP graphs.

**Batch 13:** not started.

# MotorCart — Enterprise Roadmap

**Phased delivery — extend only, never rewrite**

Source: `PROJECT-AUDIT-ENTERPRISE.md` + master directive alignment.

---

## Principles

1. **Extend** tables and routes — never rename public URLs
2. **Feature flags** for new sale modes and auction types
3. **Additive Prisma migrations** only
4. **Dedicated endpoints** beside `/api/db/query` for hot paths
5. **One pillar per quarter** when possible: Marketplace → Commerce → CRM → Community

---

## Phase A — Stabilize (0–4 weeks) P0

| # | Task | Risk | Owner |
|---|------|------|-------|
| A1 | Production env checklist (CORS, API URL, dist deploy) | Low | DevOps |
| A2 | Rate limit auth + leads POST | Low | Backend |
| A3 | Role-based table allowlist on `db/query` | Med | Backend |
| A4 | Vehicle detail API with dealer join | Low | Backend |
| A5 | Remove dead router imports | Low | Frontend |
| A6 | Document mock vs real matrix | None | Docs ✅ |
| A7 | Fix community API 500 errors | Med | Backend |
| A8 | Community mobile layout premium | Low | Frontend ✅ |

**Rollback:** Feature flags (`STRICT_DB_QUERY`), git revert per task.

---

## Phase B — Marketplace depth (4–10 weeks) P1

| # | Task | Risk |
|---|------|------|
| B1 | Listing `sale_mode` enum (owner/broker/dealer/auction) | Low |
| B2 | New car: brochure URL, waiting_days, offer JSON | Low |
| B3 | Parts: compatibility table + search API | Med |
| B4 | Wishlist fully on DB for logged-in users | Low |
| B5 | SEO sitemap from vehicle slugs | Low |
| B6 | Vehicle compare spec matrix depth | Low |
| B7 | Hub performance — cache vehicle pool | Med |

---

## Phase C — Commerce (10–18 weeks) P2

| # | Task | Risk |
|---|------|------|
| C1 | Finance: application router + lender webhooks | Med |
| C2 | Insurance: renewal reminder job (Redis cron) | Med |
| C3 | Auction: bid history + proxy bid API | Med |
| C4 | Auction KYC gate for bidders | Med |
| C5 | Razorpay/Stripe subscription webhooks | Med |

---

## Phase D — CRM unify (18–28 weeks) P2

| # | Task | Risk |
|---|------|------|
| D1 | Shared `crm_activities` table (polymorphic) | Med |
| D2 | Broker dashboard depth (role exists) | Low |
| D3 | WhatsApp template storage | Low |
| D4 | Commission ledger cross-vertical read views | Med |
| D5 | Fleet CRM shell + role | Med |

---

## Phase E — Community + Growth (28+ weeks) P3

| # | Task | Risk |
|---|------|------|
| E1 | `community.motorcart.in` build arg + DNS | Low |
| E2 | Messaging schema + API | High |
| E3 | Growth CRM queue stubs + architecture | Low |
| E4 | Follow graph, events, polls | Med |
| E5 | Video upload + moderation pipeline | High |

---

## Phase F — AI platform (parallel track) P2–P3

| # | Task | Risk |
|---|------|------|
| F1 | AI provider adapter (OpenAI, Anthropic, Gemini) | Med |
| F2 | Configurable prompt store (DB) | Low |
| F3 | Vehicle recommendation service v1 | Med |
| F4 | Brochure OCR pipeline (queue worker) | Med |
| F5 | Fraud detection signals on listings | Med |
| F6 | Dealer/customer assistant (context-aware) | Med |

---

## Phase G — Infrastructure scale (ongoing)

| # | Task |
|---|------|
| G1 | S3-compatible upload storage |
| G2 | Socket.io Redis adapter |
| G3 | OpenSearch for unified search |
| G4 | pgvector for AI embeddings |
| G5 | CDN for static + images |
| G6 | Read replica + Prisma read routing |

---

## Feature priority matrix

| Feature | Business value | Effort | Risk | Priority |
|---------|----------------|--------|------|----------|
| Prod API / CORS / deploy | Critical | S | Low | **P0** |
| Enquiry → dealer CRM (real leads) | Critical | S | Low | **P0** |
| DB query hardening | Critical | M | Med | **P0** |
| Per-user wishlist/notifications | High | S | Low | **P0** |
| Vehicle+dealer join API | High | M | Low | **P1** |
| Used car sale modes | High | M | Low | **P1** |
| New car inventory depth | High | L | Med | **P1** |
| Finance multi-lender | High | XL | Med | **P2** |
| Auction proxy/KYC | Med | L | Med | **P2** |
| Broker CRM depth | Med | L | Low | **P2** |
| Parts VIN search | Med | L | Med | **P2** |
| Growth CRM / reels | High (USP) | XL | Low | **P3** |
| AI advisors production | Med | XL | Med | **P3** |

---

## Revenue implementation map

| Stream | Existing hook | Next step |
|--------|---------------|-----------|
| Dealer subscriptions | `DealerSubscriptionPage` | Payment webhook |
| Featured listings | `FeaturedInventoryPage` | `vehicles.is_featured` |
| Lead routing fees | `LeadRouterPage` | Monetization rules |
| Directory premium | `DirectoryMonetizationPage` | Billing integration |
| Finance commissions | Finance UI partial | Ledger tables |
| API platform | — | Rate-limited API keys (future) |

---

## Folder structure (extension only)

Do **not** move existing features. Optional gradual addition:

```
frontend/src/domains/     # marketplace, commerce, crm, community
backend/src/domains/      # mirror backend domains
backend/src/app/api/v2/   # versioned APIs when needed
```

---

## Related phase docs

Detailed DB migrations: `docs/phases/PHASE-*.md`

Update this roadmap when phases complete — mark ✅ in `10_Sprint_Backlog.md`.

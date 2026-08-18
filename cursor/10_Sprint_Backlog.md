# MotorCart — Enterprise Sprint Backlog

**Living document · Update every sprint**

Priority: **P0** Critical · **P1** High · **P2** Medium · **P3** Future

Status: 🔴 Open · 🟡 In Progress · 🟢 Done · ⚪ Planned

---

## P0 — Critical (do first)

| ID | Area | Task | Status | Owner |
|----|------|------|--------|-------|
| P0-01 | DevOps | Production env checklist (CORS, API URL, secrets) | 🔴 | |
| P0-02 | Backend | Fix `/api/db/query` 500s — community tables (`social_posts`, `user_follows`) | 🔴 | |
| P0-03 | Backend | Fix admin query 500s (`support_tickets`, `platform_fraud_alerts`) | 🔴 | |
| P0-04 | Backend | Role-based table allowlist on `db/query` (SEC-001) | 🟢 | Phase 2 |
| P0-05 | Backend | Rate limit `POST /api/leads` + auth endpoints | 🔴 | |
| P0-06 | Commerce | Enquiry → dealer CRM end-to-end (real leads visible) | 🟢 | Phase 2 |
| P0-07 | Customer | Wishlist fully DB-backed for logged-in users | 🔴 | |
| P0-08 | Customer | Notifications per-user (not guest-only) | 🔴 | |

---

## P1 — High value

| ID | Area | Task | Status |
|----|------|------|--------|
| P1-01 | Backend | Vehicle detail API with embedded dealer join | 🟢 |
| P1-11 | Platform | Organization / partner tenant foundation (Phase 3) | 🟢 |
| P1-02 | Marketplace | Listing `sale_mode` metadata (owner/broker/dealer/auction) | ⚪ |
| P1-03 | New car | Brochure URL, waiting_days, offers JSON on inventory | ⚪ |
| P1-04 | Parts | Compatibility table + search API | ⚪ |
| P1-05 | SEO | Sitemap generation from vehicle slugs | ⚪ |
| P1-06 | Performance | Cache `getVehiclePool()` / hub loads | 🔴 |
| P1-07 | Community | Harden feed — remove mock when DB rows exist | 🟡 |
| P1-08 | Community | Mobile bottom nav + hide footer/FABs | 🟢 |
| P1-09 | Frontend | More lazy routes to shrink main bundle | 🔴 |
| P1-10 | Admin | Disable `VITE_ADMIN_DEMO_FALLBACK` in production builds | 🔴 |

---

## P2 — Commerce & CRM depth

| ID | Area | Task | Status |
|----|------|------|--------|
| P2-01 | Finance | Multi-lender eligibility engine architecture | ⚪ |
| P2-02 | Finance | Lender status webhooks | ⚪ |
| P2-03 | Insurance | Renewal reminder cron job | ⚪ |
| P2-04 | Auction | Bid history table + proxy bid API | ⚪ |
| P2-05 | Auction | KYC gate for bidders | ⚪ |
| P2-06 | CRM | Shared `crm_activities` timeline table | ⚪ |
| P2-07 | Broker | Broker dashboard depth (shell exists) | ⚪ |
| P2-08 | Billing | Razorpay/Stripe subscription webhooks | ⚪ |
| P2-09 | Parts | VIN / reg-no compatibility search | ⚪ |
| P2-10 | Search | OpenSearch integration design | ⚪ |

---

## P3 — Growth, AI, scale

| ID | Area | Task | Status |
|----|------|------|--------|
| P3-01 | Community | `community.motorcart.in` subdomain build | ⚪ |
| P3-02 | Community | Messaging (`conversations`, `messages`) | ⚪ |
| P3-03 | Community | Follow graph, events, polls, jobs | ⚪ |
| P3-04 | Growth CRM | WhatsApp template marketing | ⚪ |
| P3-05 | Growth CRM | Social scheduler + reel generator | ⚪ |
| P3-06 | AI | Provider adapter (OpenAI, Anthropic, Gemini) | ⚪ |
| P3-07 | AI | Configurable prompt store in DB | ⚪ |
| P3-08 | AI | Vehicle recommendation v1 | ⚪ |
| P3-09 | AI | Brochure OCR pipeline (queue worker) | ⚪ |
| P3-10 | Infra | S3 upload storage adapter | ⚪ |
| P3-11 | Infra | Socket.io Redis adapter | ⚪ |
| P3-12 | Infra | pgvector for embeddings | ⚪ |
| P3-13 | Mobile | Customer app — push notifications | ⚪ |
| P3-14 | Roles | OEM, fleet owner, insurance company roles | ⚪ |

---

## Documentation (meta)

| ID | Task | Status |
|----|------|--------|
| DOC-01 | Enterprise `/cursor` folder v2.0 complete | 🟢 |
| DOC-02 | Cursor always-on rule | 🟢 |
| DOC-03 | Mock vs real matrix maintained | 🟢 |
| DOC-04 | Feature template for new work | 🟢 |

---

## Recently completed

| Date | Item |
|------|------|
| 2026-07 | Premium hub pages — Services, Insurance, Parts, Community |
| 2026-07 | Navbar 2-layer, mobile drawer, scroll-to-top |
| 2026-07 | Community mobile nav fix, footer/FAB hide |
| 2026-07 | Enterprise cursor documentation suite v2.0 |
| 2026-07 | Docker frontend/nginx deploy pipeline |

---

## Sprint planning notes

**Current focus recommendation:** P0 backend stability (query 500s, allowlist) → P0 leads/wishlist → P1 community feed real data.

**Do not start P3 AI/Growth until P0 stability complete.**

See phase details: `21_Enterprise_Roadmap.md`

---

## How to add tasks

```markdown
| P1-XX | Area | Task description | 🔴 |
```

Update status emoji when work begins/completes. Link to feature doc from `20_Feature_Documentation_Template.md` for large items.

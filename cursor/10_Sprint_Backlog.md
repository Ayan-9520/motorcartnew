# MotorCart — Enterprise Sprint Backlog

**Living document · Update every sprint**

Priority: **P0** Critical · **P1** High · **P2** Medium · **P3** Future

Status: 🔴 Open · 🟡 In Progress · 🟢 Done · ⚪ Planned

---

## P0 — Critical (do first)

| ID | Area | Task | Status | Owner |
|----|------|------|--------|-------|
| P0-01 | DevOps | Production env checklist (CORS, API URL, secrets) | 🟡 | `.env.production.example` + RUN_DB_SEED=false; fill CHANGE_ME on VPS |
| P0-02 | Backend | Fix `/api/db/query` 500s — community tables (`social_posts`, `user_follows`) | 🟢 | Batch 6: community tables never-allow; dedicated REST | |
| P0-03 | Backend | Fix admin query 500s (`support_tickets`, `platform_fraud_alerts`) | 🔴 | |
| P0-04 | Backend | Role-based table allowlist on `db/query` (SEC-001) | 🟢 | Phase 2 |
| P0-05 | Backend | Rate limit `POST /api/leads` + auth endpoints | 🟢 | Phase 4 leads; global `/api/` limiter |
| P0-06 | Commerce | Enquiry → dealer CRM end-to-end (real leads visible) | 🟢 | Phase 2 |
| P0-07 | Customer | Wishlist fully DB-backed for logged-in users | 🟢 | Phase 4 |
| P0-08 | Customer | Notifications per-user (not guest-only) | 🟢 | Phase 4 |

---

## P1 — High value

| ID | Area | Task | Status |
|----|------|------|--------|
| P1-01 | Backend | Vehicle detail API with embedded dealer join | 🟢 |
| P1-11 | Platform | Organization / partner tenant foundation (Phase 3) | 🟢 |
| P1-12 | Commerce | Vehicle quotation engine (Phase 5A) | 🟢 |
| P1-13 | Commerce | Real customer test-drive product (Phase 5B) | 🟢 |
| P1-14 | Marketplace | Exact PIN stock discovery (Phase 5C) | 🟢 |
| P1-15 | Community | Real community network — profiles, feed, follow, reports (Batch 6) | 🟢 |
| P1-16 | CRM | Sales OS + PIN lead routing + Lead Board (Batch 7) | 🟢 |
| P1-17 | Commerce | Revenue, billing, payouts, GST foundation, loyalty ledger (Batch 8) | 🟢 |
| P1-18 | Customer | Super-app, MotorCart One, saved searches, reminders, used-media trust, valuation (Batch 9) | 🟢 |
| P1-19 | CRM | Communication OS, dialer, multilingual AI sales agent, best-deal (Batch 10) | 🟢 |
| P1-20 | Partners | Partner / Industry OS — parts, workshop, OEM, bank/NBFC, insurance, jobs (Batch 11) | 🟢 |
| P1-21 | Launch | Batch 12 integration: search, admin metrics, observability, security hardening | 🟢 |
| P1-02 | Marketplace | Listing `sale_mode` metadata (owner/broker/dealer/auction) | ⚪ |
| P1-03 | New car | Brochure URL, waiting_days, offers JSON on inventory | ⚪ |
| P1-04 | Parts | Compatibility table + search API | 🟢 | Batch 11 `/api/parts/search` + `PartCompatibilityRule` |
| P1-05 | SEO | Sitemap generation from vehicle slugs | ⚪ |
| P1-06 | Performance | Cache `getVehiclePool()` / hub loads | 🔴 |
| P1-07 | Community | Harden feed — remove mock when DB rows exist | 🟢 |
| P1-08 | Community | Mobile bottom nav + hide footer/FABs | 🟢 |
| P1-09 | Frontend | More lazy routes to shrink main bundle | 🔴 |
| P1-10 | Admin | Disable `VITE_ADMIN_DEMO_FALLBACK` in production builds | 🔴 |

---

## P2 — Commerce & CRM depth

| ID | Area | Task | Status |
|----|------|------|--------|
| P2-01 | Finance | Multi-lender eligibility engine architecture | 🟢 | Phase C REST + server eligibility |
| P2-02 | Finance | Lender status webhooks | ⚪ |
| P2-03 | Insurance | Renewal reminder cron job | ⚪ |
| P2-04 | Auction | Bid history table + proxy bid API | ⚪ |
| P2-05 | Auction | KYC gate for bidders | ⚪ |
| P2-06 | CRM | Shared `crm_activities` timeline table | 🟢 | Batch 7 |
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
| 2026-10-09 | Home "Popular models" is now real popularity — new `GET /api/new-car/popular-models` (leads, wishlists, quotations, test drives — last 120 days, weighted, 10-min cache) + India best-seller rank tie-break, then photo/stock depth; no longer "last uploaded". Two-wheelers (bike body types / 2W-only brands) excluded from all new-car listings; dealer Excel upload routes bike rows to `bikes` (any dealer type) and never mirrors them into new-car showroom stock; new-car showroom bulk import rejects bike rows with a clear message |
| 2026-10-08 | Parts marketplace sellers — approved dealers (all types) + service partners can sell parts alongside `parts_seller` (route roles, workspace roots, "Parts store" nav, back-to-dashboard link in parts workspace); `/api/parts/seller/*` now checks live account state (pending approval / suspended → 403); listings stamped with seller business name; suspended/closed sellers' parts hidden from catalog/detail and blocked at checkout; sellers can't order their own listing |
| 2026-10-08 | Parts store end-to-end real — 58-SKU Motorcart Parts Desk seed migration (real brands, MRP, bulk tier, HSN); new `/api/parts/{catalog,checkout,my-orders,seller/orders,seller/listings}` with server pricing + GST split, atomic stock lock, invoice no., timeline, buyer/seller notifications, cancel + restock, verified-purchase reviews; legacy `create_part_order` RPC delegates to checkout; non-admin `parts` writes blocked in db shim; fixed `parts` soft-delete 500. Frontend: removed fake orders/reviews, bulk price mirrors server, honest copy, branded part artwork, premium detail/cart/checkout (validation, GSTIN)/orders/invoice, supplier pipeline (confirm→pack→ship→deliver). Fixed logged-in buyers bounced from /checkout & /orders to dashboard; admins can open Parts desk |
| 2026-10-08 | Homepage hero follows site theme — white canvas + dark text in light mode, dark canvas + white text in dark mode (green only as accent); badges, search panel, chips use theme tokens |
| 2026-10-08 | Homepage hero v3 — split layout on dark-green canvas: copy left, car video in glowing rounded frame right with floating glass badges (Live auctions / Verified dealers / Bank-grade finance), search module full width below |
| 2026-10-08 | Homepage hero premium refresh — dark-green cinematic scrim + glow + grid over video, white headline with green shimmer, live-dot eyebrow chip, rotating line pill, glass CTAs, trust row (Verified dealers / Bank-grade finance / Live auctions / AI search) |
| 2026-10-08 | Premium site footer — dark navy theme with green glow, CTA band (Buy / Sell), glass contact card, single-line column headings, white logo variant |
| 2026-10-06 | Content pages (Press, Careers, Privacy, Terms, FAQs, Jobs) premium refresh — glowing editorial hero, larger title/lead, sections as accent cards; fixed invisible primary button text inside doc sections (link colour rule overrode button text) |
| 2026-10-06 | Pre-host health check — FE/BE typecheck + lint clean (fixed conditional hooks crash risk on service booking, hook-named helpers in platform-admin/notifications, stale backend test type); 376/376 backend unit tests; 22 public/CRM routes × desktop/mobile with zero page errors, failed APIs or overflow; homepage auction & pre-owned sections show honest empty state instead of demo cards in real-data mode |
| 2026-10-03 | Motor insurance overhaul — shared pricing engine `insurance-engine.ts` (FE/BE identical): IRDAI TP FY26-27 (annual + 3/5-yr long-term + EV), tariff OD by zone/cc/age × insurer factor, IDV depreciation slabs ±10%, NCB slabs + 90-day lapse, voluntary deductible & anti-theft caps, PA owner-driver, CNG kit, add-ons as % of IDV with age/NCB eligibility, 18% GST; scenarios new (bundled 1+3 / 1+5, NCB transfer) / renew (NCB step-up, break-in inspection, standalone OD only with active TP) / used (seller NCB not transferable, 14-day transfer, inspection, Form 29/30); 9-insurer catalogue (CSR, garages, helplines) + `insurance_partners` seed; new `insurance_claim_requests` table; REST `/api/insurance/{insurers,premium,applications,applications/[id],claim-requests,claim-requests/[id]}` (server re-prices, desk notifications, issued → insurance wallet); removed fake submit success + demo applications; premium hub, quote, compare, apply (KYC, nominee, documents, honest no-payment flow), renew calculator, claims intimation/tracker, customer tracker (payment/inspection links, timeline, cancel), broker/admin desk; `npm run test:insurance` (11 tests) |
| 2026-10-01 | Finance overhaul — product-wise lender rate card (Sept 2026 published rates, 19 banks/NBFCs, `lib/finance/rate-card.ts` mirrored FE/BE); CIBIL-band risk pricing; eligibility uses PV of EMI (interest-aware) + product LTV cap + product tenure/income rules; offers ranked by total cost incl. processing fee + 18% GST; refinance includes foreclosure + new fee with break-even; realistic approval chance; data migration seeds `banks` (prod table was empty); premium `/finance` hub (live quote card, rates-from per product, lender rate table, how-it-works); homepage bank strip + partner strip derived from rate card |
| 2026-10-01 | Auctions — photo upload from device (cover/reorder/remove) in lot form; vehicle details (year, km, fuel, owners, masked reg no., RC, insurance, loan, accident, inspection notes) shown on lot page with clickable gallery; customers can sell via `/auctions/sell` (own listing or manual details + min 3 photos, owner declaration, admin approval); admin bell notification on new pending lot, seller notified on approve/reject, winner/seller bell notifications on close; seller contact shown on pending lots in auction desk; real per-category counts on hub |
| 2026-09-30 | Auctions end-to-end — server auction engine (locked/validated bids, anti-snipe +2 min, proxy auto-bid, reserve-checked finalize, auto go-live/close sweep, winner/outbid/seller notifications); lot creation (admin/partner direct, dealer → `pending` approval, new migration); approve/reject + winner contact in auction desks; dealer desk uses real bids/won/auto-bid + "Sell via auction"; `/api/db/query` blocks direct bid/result writes and hides pending lots; frontend reads `start_price`/`auction_category`, removed fake demo bids |
| 2026-09-30 | Dealer public profile — shows owner's dealer-less listings on primary showroom (API + client fallback); dealer inventory save attaches `dealer_id`; `/api/db/query` vehicle updates can't reassign seller or move to another dealer's showroom |
| 2026-09-30 | Dealer inventory edit — title rebuilt from year/brand/model/variant on save (was stuck on old name); dealer-saved stock marked `dealer_offer`; card seller chip uses sale mode instead of "Motors" name heuristic |
| 2026-09-30 | Premium header — theme-aware glass header (white in light, graphite in dark) with navy→green top accent line; white-text wordmark variant (`motorcart-wordmark-dark.png`) auto-swaps in dark mode; refined search pill, menu bar and active link in both themes |
| 2026-09-29 | Phone/desktop buy-sell QA — mobile header menu button no longer clipped (cart/theme move to menu below `sm`); vehicle detail on mobile shows price/CTA/enquiry right after gallery (desktop unchanged); used cards drop fake "buyers viewed" line for real seller-type text; mobile filter button labelled |
| 2026-09-29 | Brand refresh — new transparent lockup (icon + wordmark, light/dark) everywhere; text-only wordmark in header; header stays light in dark mode (scoped light tokens on `.nav-shell`) |
| 2026-09-29 | Navigation after deploy — stale-chunk auto-reload per 30s (not once per session), `vite:preloadError` handler, router `errorElement` with Back/Home/Reload; dealer posting via public Sell attaches own showroom (leads → Lead CRM, success → inventory); enquiries on seller-without-dealer listings route to seller's showroom (incl. re-sent duplicates); inventory shows owner's dealer-less listings |
| 2026-09-29 | Buy/sell follow-up — filter sidebar Fuel/Body/City/Colour options in real-data mode; `certified=1` + `saleMode` URL filters; similar vehicles from matching pool (new stock vs used); owner-listing enquiries notify seller + shown under My listings (`GET /api/customer/listing-enquiries`), no PIN re-route to other dealers; admin approve creates missing dealer row |
| 2026-09-29 | Buy/sell audit — block self role/status edits via `/api/db/query`; vehicle insert only under own dealer; used detail returns full row (kms/owners/description); EV-new + fuzzy fuel/transmission/body filters; legacy browse redirects keep query; new-car duplicate enquiry; loan link carries vehicle price/type; new cars hide km/owner; dealer contact in listing metadata + featured on create; bulk Excel keeps used-car dealer stock as used; admin moderation real dealer names; `/used-cars` featured picks from live stock |
| 2026-09-12 | Buy colour swatches — per-photo paint names in Edit stock; public gallery hint when colours missing |
| 2026-09-12 | Mobile Play Store pack — 1024 icons, feature graphic, Privacy/Terms in-app, assetlinks template, listing copy |
| 2026-09-12 | Buy New Cars — Newest uses real inventory timestamps + photo-first (fix fake Date.now sort) |
| 2026-09-11 | Production honesty — NCD shared-path remap fix; DSA/parts/service fake KPIs gated; deliveries from delivered leads |
| 2026-09-11 | Mobile companion — Inter + website CRM light/dark tokens (`#25D366`, `#f0f2f5` / `#000`) |
| 2026-09-11 | Public new-car detail — emit color_options + paint/image merge so live gallery/swatches match dealer uploads |
| 2026-09-11 | Mobile companion — real new-car inventory KPIs + My stock tab (same `/api/new-car/inventory` as web) |
| 2026-09-10 | Edit stock dialog — prefill all fields on open + richer pricing/photos form |
| 2026-09-10 | New-car Buy visibility — photo save no longer flips stock to out_of_stock; public stock recovers imaged rows |
| 2026-07 | Premium hub pages — Services, Insurance, Parts, Community |
| 2026-07 | Navbar 2-layer, mobile drawer, scroll-to-top |
| 2026-07 | Community mobile nav fix, footer/FAB hide |
| 2026-07 | Enterprise cursor documentation suite v2.0 |
| 2026-08-18 | Phase 4 — customer 360 / garage / wishlist / notifications real data |
| 2026-08-18 | Phase 5A — quotation engine (server-owned snapshot pricing) |
| 2026-08-18 | Phase 5B — real test-drive bookings (requested → confirmed lifecycle) |
| 2026-08-19 | Phase 5C — exact PIN stock discovery (`GET /api/inventory/by-pincode`) |
| 2026-08-19 | Batch 6 — real Community & Professional Automotive Network (`cursor/29_Community.md`) |
| 2026-08-19 | Batch 9 — Customer Super-App + MotorCart One + used trust + valuation (`cursor/32_Customer_SuperApp_MotorCartOne_Valuation.md`) |
| 2026-08-20 | Batch 12 — final integration / production readiness (`cursor/35_Final_Platform_Gap_Audit.md`) |
| 2026-09-25 | Buy brand models: Mercedes stock filter — API token `Mercedes` + slug alias `mercedes-benz` + backend brand token OR |
| 2026-09-29 | Compare resolves new-car stock ids; used-car entry: dealer drawer Draft respected, owner listing `direct_owner` + seller phone + sell-request `vehicleId` |

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

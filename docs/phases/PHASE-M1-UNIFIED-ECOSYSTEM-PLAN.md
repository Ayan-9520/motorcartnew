# Phase M1 — Unified MotorCart Ecosystem Architecture & Implementation Plan

**Date:** 2026-06-04  
**Status:** Approved for planning (architecture only)  
**Constraints:** No Prisma changes · No db push · No implementation in this phase

**Builds on:** Marketplace, Auctions, Broker CRM, Community, Business Directory (K2), Growth CRM + Lead Engine (J4), Poster Builder, WhatsApp Foundation (L1), Social Scheduler Foundation (L2), Founder Dashboard (M0), Directory Monetization (K1)

---

## Executive summary

MotorCart today is a **multi-module platform** sharing MySQL and JWT auth, but each vertical (marketplace, community, growth, auctions) owns its own objects and navigation. **M1–M6** define how those modules become **one ecosystem**: one identity, one business graph, one lead router, one notification inbox, one search experience, and one investor story.

This document is the **blueprint only**. Implementation is sequenced in waves behind feature flags, reusing existing tables and link keys (`user_id`, `entity_type` + `entity_id`) wherever possible.

---

## 1. Final architecture diagram

```mermaid
flowchart TB
  subgraph Experience["Experience layer"]
    WEB[Web / PWA]
    NAV[Unified nav + workspace switcher]
    SEARCH[Unified search]
    INBOX[Notification center]
  end

  subgraph Identity["M1 — Unified identity"]
    AUTH[JWT session + device sessions]
    CTX[Ecosystem context resolver]
    RBAC[Role + approval + KYC gates]
  end

  subgraph Business["M2 — Unified business graph"]
    BP[Business Profile hub]
    CBP[Community business profile]
    DIR[Directory listing view]
    GW[Growth workspace]
    INV[Marketplace inventory]
    AUC[Auction participation]
  end

  subgraph Operations["Operations layer"]
    LEAD[M3 — Lead routing engine]
    NOTIF[M4 — Notification aggregator]
    IDX[M5 — Federated search index]
  end

  subgraph Modules["Product modules (existing)"]
    MKT[Marketplace]
    COM[Community]
    GRO[Growth CRM]
    BRK[Broker CRM]
    AUCTION[Auctions]
    FIN[Finance]
    INS[Insurance]
    PARTS[Parts]
    SVC[Services]
  end

  subgraph Platform["Platform services"]
    ADMIN[Super admin / founder]
    FLAGS[Feature flags]
    BILL[Monetization placeholders → billing]
    RT[Realtime / Socket]
  end

  WEB --> NAV
  NAV --> AUTH
  AUTH --> CTX
  CTX --> RBAC
  CTX --> BP
  BP --> CBP
  BP --> DIR
  BP --> GW
  BP --> INV
  BP --> AUC
  CTX --> LEAD
  CTX --> NOTIF
  CTX --> SEARCH
  SEARCH --> IDX
  LEAD --> MKT
  LEAD --> COM
  LEAD --> GRO
  LEAD --> AUCTION
  NOTIF --> COM
  NOTIF --> GRO
  NOTIF --> AUCTION
  IDX --> MKT
  IDX --> COM
  IDX --> DIR
  Modules --> Business
  ADMIN --> Platform
  FLAGS --> Modules
```

**North-star principle:** The **User** is the root of trust; the **Business Profile** is the root of commercial identity; every module attaches via typed links, not duplicate signups.

---

## 2. Data flow diagram

```mermaid
sequenceDiagram
  participant U as User (one account)
  participant I as M1 Identity context
  participant B as M2 Business hub
  participant M as Module (e.g. Marketplace)
  participant L as M3 Lead router
  participant N as M4 Notifications
  participant S as M5 Search index

  U->>I: Login (JWT)
  I->>I: Resolve roles, approval, workspaces
  U->>B: Open "My business"
  B->>B: Load graph: community + directory + growth + dealer
  U->>M: Action (list vehicle, post, bid)
  M->>B: Validate owner via entity_id link
  M->>L: Emit lead event (source=marketplace)
  L->>L: Route to owner CRM by business type
  L->>N: Enqueue alert (new lead)
  M->>S: Publish index document (async)
  U->>S: Unified search query
  S-->>U: Blended results (vehicles, businesses, posts…)
  N-->>U: Single inbox (read/unread)
```

### 2.1 Canonical identifiers (logical, no schema change in M1 plan)

| Concept | Primary key today | Ecosystem role |
|---------|-------------------|----------------|
| Person | `users.id` | Single sign-on, KYC, roles |
| Business (logical) | `(entity_type, entity_id)` or `community_business_profiles.id` | Hub node in M2 |
| Growth ops | `growth_workspaces.id` | Campaigns, posters, WhatsApp, lead forms |
| Dealer storefront | `dealers.id` | Inventory + dealer CRM |
| Broker desk | `brokers.id` | Broker CRM (separate module, linked by owner) |

**Link rule (already partially implemented in K2/J):**  
`community_business_profiles.entity_id` ↔ `growth_workspaces.entity_id` ↔ `dealers.id` (when `entity_type = dealer`).

---

## 3. Module relationships

```mermaid
erDiagram
  USER ||--o{ DEALER : owns
  USER ||--o{ BROKER : owns
  USER ||--o{ COMMUNITY_USER_PROFILE : has
  USER ||--o{ COMMUNITY_BUSINESS_PROFILE : owns
  USER ||--o{ GROWTH_WORKSPACE : owns
  USER ||--o{ SOCIAL_POST : authors
  USER ||--o{ NOTIFICATION : receives

  COMMUNITY_BUSINESS_PROFILE ||--o| DIRECTORY_LISTING : "view/API K2"
  COMMUNITY_BUSINESS_PROFILE ||--o| GROWTH_WORKSPACE : "entity_id match"
  DEALER ||--o| COMMUNITY_BUSINESS_PROFILE : "entity_id"
  DEALER ||--o{ VEHICLE : lists
  DEALER ||--o{ DEALER_LEAD : CRM
  GROWTH_WORKSPACE ||--o{ LEAD_CAPTURE_EVENT : forms
  GROWTH_WORKSPACE ||--o{ WHATSAPP_BROADCAST : campaigns
  AUCTION ||--o{ AUCTION_BID : participation
  UNIFIED_LEAD ||--o| USER : assigned_to
  UNIFIED_LEAD }o--|| SOURCE_MODULE : origin

  USER {
    uuid id PK
    string role
    string approval_status
  }
  COMMUNITY_BUSINESS_PROFILE {
    uuid id PK
    uuid owner_user_id FK
    string entity_type
    string entity_id
  }
  GROWTH_WORKSPACE {
    uuid id PK
    uuid owner_user_id FK
    string entity_id
  }
```

| Module | Upstream dependency | Downstream consumers |
|--------|---------------------|----------------------|
| Marketplace | User, Dealer | Leads, Search, Notifications, Directory (dealer discovery) |
| Community | User, Business profile | Directory feed, Search (posts/groups), Notifications |
| Directory (K2) | Community business profiles | Search (businesses), Monetization (K1), Leads |
| Growth CRM | User, Workspace | Lead engine, WhatsApp (L1), Social (L2), Notifications |
| Auctions | User, KYC | Notifications, Search, Leads (registration interest) |
| Broker CRM | User, Broker | Leads (broker-owned), separate workspace |
| Finance / Insurance | User, Applications | Notifications, admin approvals |
| Founder (M0) | Read-only aggregates | Investor narrative, ops KPIs |

---

## M1 — Unified Identity Layer

### 3.1 Problem today

- One `users` row exists, but **session context is module-local**: dealer dashboard, growth workspace header, community persona, auction gate each assume different “active hat.”
- Post-login routing (`workspace-redirect`, role dashboards) sends users to **one silo** unless they know cross-links (e.g. `/dashboard/growth`).

### 3.2 Target design

**Ecosystem Identity Context** (resolved on every authenticated request):

```text
EcosystemContext {
  user_id
  primary_role          // AppRole
  approval_status
  kyc_status
  personas[]            // customer | business_owner | admin
  businesses[]          // { entity_type, entity_id, business_profile_id, slug }
  active_workspace      // { type: dealer|growth|broker|..., id }
  entitlements[]        // feature flags + plan tier
  capabilities[]        // sell_vehicle, post_community, run_campaign, bid_auction, ...
}
```

### 3.3 Dealer journey (example)

| Step | Identity action | Module unlocked |
|------|-----------------|-----------------|
| 1 | Register business (`dealer`) | Pending approval |
| 2 | Admin approves | `active` + dealer record |
| 3 | Auto-provision links (M2) | Community page + directory + growth workspace |
| 4 | User switches hat in nav | Same JWT; `active_workspace` changes |
| 5 | List vehicle | Marketplace uses `dealer.id` from context |
| 6 | Post update | Community uses `owner_user_id` |
| 7 | Launch campaign | Growth uses `growth_workspace.id` |
| 8 | Register for auction | Auction checks KYC + dealer link |

### 3.4 Implementation plan (future, no schema required for v1)

| Wave | Deliverable | Approach |
|------|-------------|----------|
| M1.0 | `GET /api/ecosystem/context` | Compose from existing tables + flags |
| M1.1 | Workspace switcher UI | Writes `active_workspace` to session metadata or client store |
| M1.2 | Unified post-login | `resolve-post-login` → ecosystem home, not single CRM |
| M1.3 | Capability matrix | Map role + approval → capabilities (config-driven) |
| M1.4 | SSO / OAuth merge | Same context resolver on OAuth callback |

**Flag proposal:** `FEATURE_M1_UNIFIED_IDENTITY` (default off)

---

## M2 — Unified Business Layer

### 4.1 Central object: Business Profile Hub

Logical aggregate (API composition, not necessarily one new table in v1):

```text
BusinessProfileHub {
  business_profile_id    // community_business_profiles.id
  owner_user_id
  entity_type            // dealer | broker | dsa | ...
  entity_id              // dealers.id | brokers.id | ...
  community { slug, followers, feed_enabled }
  directory { category, monetization, verified }
  growth { workspace_id, campaigns, lead_forms }
  marketplace { dealer_id, active_listings_count }
  auction { partner_status, entries_count }
  metadata { brand, locations, services }
}
```

### 4.2 Relationship rules

```mermaid
flowchart LR
  U[User] --> BP[Business Profile Hub]
  BP --> CBP[Community Business Profile]
  BP --> DIR[Directory Listing API]
  BP --> GW[Growth Workspace]
  BP --> D[Dealer / Broker / DSA entity]
  D --> V[Vehicles]
  D --> DL[Dealer leads]
  GW --> LC[Lead capture events]
  GW --> WA[WhatsApp broadcasts]
  CBP --> SP[Social posts]
```

| Link | Current state | M2 target |
|------|---------------|-----------|
| User → Business profile | Exists (`owner_user_id`) | Mandatory on business signup |
| Business → Growth workspace | Partial (`entity_id` match in K2) | Provision on approval job |
| Business → Dealer inventory | `dealers.owner_id` | Surface in hub API |
| Business → Directory | K2 read model | Single slug across surfaces |
| Monetization (K1) | `metadata` on profile | Shown in hub + directory |

### 4.3 Implementation plan

| Wave | Deliverable |
|------|-------------|
| M2.0 | `GET /api/ecosystem/business/:slug` — aggregated hub |
| M2.1 | Onboarding orchestration (approve → create missing links) |
| M2.2 | Admin “business graph” view in super-admin |
| M2.3 | Conflict resolution (duplicate slugs, entity mismatch) |

**Flag:** `FEATURE_M2_UNIFIED_BUSINESS`

---

## M3 — Unified Lead Routing

### 5.1 Lead sources (ingress)

| Source ID | Origin module | Typical trigger |
|-----------|---------------|-----------------|
| `marketplace` | Vehicle listing / dealer contact | Call, form, chat |
| `directory` | Business profile CTA | Contact, WhatsApp click |
| `community` | Post / DM / business page | Inquiry |
| `campaign` | Growth form / broadcast reply | Capture event |
| `auction` | Lot interest / registration | Bid intent, register |
| `broker` | Broker CRM | Existing broker leads (read-only bridge) |

### 5.2 Routing engine (logical)

```mermaid
flowchart TD
  IN[Lead ingress event] --> NORM[Normalize payload]
  NORM --> CLS[Classify: source + intent]
  CLS --> OWN[Resolve owner business]
  OWN --> RT{Business type}
  RT -->|dealer| DCRM[Dealer CRM / growth pipeline]
  RT -->|broker| BCRM[Broker CRM]
  RT -->|dsa| DSA[DSA workspace]
  RT -->|insurance_agent| INS[Insurance funnel]
  RT -->|workshop| SVC[Service partner inbox]
  RT -->|parts_seller| PARTS[Parts supplier leads]
  RT -->|unknown| ADMIN[Platform queue]
  DCRM --> TRACK[Unified tracking ID in metadata]
  BCRM --> TRACK
  TRACK --> NOTIF[M4 notification]
```

### 5.3 Ownership & tracking (no new table v1)

**Unified Lead Record (logical):**

```text
{
  id: "<source>:<native_id>",      // e.g. growth:event_uuid
  source: "campaign",
  owner: { user_id, entity_type, entity_id },
  assignee: { user_id | null },
  stage: "new | contacted | …",
  native_refs: { growth_event_id?, dealer_lead_id?, lead_id? },
  attribution: { campaign, utm, listing_id, post_id },
  created_at, updated_at
}
```

| Storage today | M3 bridge strategy |
|---------------|-------------------|
| `growth_lead_capture_events` + `payload._crm` | Canonical for growth/directory/campaign |
| `dealer_leads` / `leads` | Marketplace ingress mirrored via webhook-style internal event |
| Broker leads | Read-only federation; no broker module edits in early waves |
| Auction interest | `metadata` on bid/register + router copy |

### 5.4 Implementation plan

| Wave | Deliverable |
|------|-------------|
| M3.0 | Lead event contract + `POST /api/ecosystem/leads/ingress` (internal) |
| M3.1 | Router rules config (YAML/JSON in platform config) |
| M3.2 | Unified pipeline UI in Growth (federated view) |
| M3.3 | Dealer CRM mirror (event bus only, no dealer file edits until approved) |
| M3.4 | SLA + assignment policies |

**Flag:** `FEATURE_M3_UNIFIED_LEADS`

---

## M4 — Unified Notification Center

### 6.1 Problem today

Notifications are **fragmented**: `notifications`, `platform_notifications`, `auction_notifications`, growth message logs, email stubs.

### 6.2 Target design

```text
UnifiedNotification {
  id
  user_id
  category          // community | lead | auction | campaign | directory | system
  severity          // info | action_required | critical
  title, body, deep_link
  source_module
  source_ref_id
  read_at
  created_at
  metadata
}
```

**Ingestion pattern (aggregator):**

```mermaid
flowchart LR
  COM[Community events] --> AGG[Notification aggregator]
  LEAD[Lead router] --> AGG
  AUC[Auction engine] --> AGG
  GRO[Growth broadcasts] --> AGG
  DIR[Directory follow/monetization] --> AGG
  AGG --> INBOX[User inbox API]
  AGG --> PUSH[Push / email / WhatsApp stub]
```

### 6.3 UX

- Single bell icon in global nav
- Filters: All · Leads · Auctions · Community · Campaigns
- Deep links into correct workspace (M1 context switch if needed)

### 6.4 Implementation plan

| Wave | Deliverable |
|------|-------------|
| M4.0 | `GET /api/ecosystem/notifications` — merge existing tables |
| M4.1 | Mark read / archive |
| M4.2 | Realtime channel `user:{id}:notifications` |
| M4.3 | Preference center (per category opt-out) |

**Flag:** `FEATURE_M4_UNIFIED_NOTIFICATIONS`

---

## M5 — Unified Search

### 7.1 Search domains

| Index | Content | Primary table(s) |
|-------|---------|----------------|
| `vehicles` | Cars, bikes, trucks | `vehicles` |
| `businesses` | Directory + community business | `community_business_profiles` |
| `posts` | Feed content | `social_posts` |
| `groups` | Community groups | `community_groups` |
| `auctions` | Lots / events | auction tables |
| `parts` | Catalog SKUs | parts tables |
| `services` | Workshops, bookings | service centers |

### 7.2 Architecture

```mermaid
flowchart TB
  Q[User query] --> API[GET /api/ecosystem/search]
  API --> ORCH[Search orchestrator]
  ORCH --> V[Vehicles provider]
  ORCH --> B[Businesses provider]
  ORCH --> P[Posts provider]
  ORCH --> A[Auctions provider]
  ORCH --> PT[Parts provider]
  ORCH --> S[Services provider]
  ORCH --> RANK[Rank + dedupe + blend]
  RANK --> RES[Unified results page]
```

**Phase 1 (no Elasticsearch required):** parallel SQL queries + in-memory merge (flags per domain).  
**Phase 2:** OpenSearch / Typesense with nightly sync jobs.

### 7.3 Result card types

- `vehicle_card`, `business_card`, `post_card`, `auction_card`, `part_card`, `service_card`
- Each card carries `deep_link` and `entity` for M1 context

### 7.4 Implementation plan

| Wave | Deliverable |
|------|-------------|
| M5.0 | Federated search API (SQL merge) |
| M5.1 | Global search bar in marketing nav |
| M5.2 | Filters + facets by domain |
| M5.3 | External index + analytics |

**Flag:** `FEATURE_M5_UNIFIED_SEARCH`

---

## M6 — Investor Blueprint

### 8.1 Complete ecosystem diagram (investor view)

```mermaid
flowchart TB
  subgraph Demand["Demand side"]
    C[Consumers]
    B2B[B2B buyers / fleets]
  end

  subgraph Platform["MotorCart platform"]
    subgraph Core["Core loops"]
      DISC[Discovery: Search + Directory]
      TRUST[Trust: KYC + verified business]
      TRANS[Transactions: Marketplace + Auctions]
      ENG[Engagement: Community + Campaigns]
    end
    subgraph Monetization["Monetization layers"]
      SUB[Subscriptions]
      COMM[Commissions]
      ADS[Featured / sponsored K1]
      SAAS[Growth CRM SaaS]
    end
  end

  subgraph Supply["Supply side"]
    DEAL[Dealers]
    BRK[Brokers]
    DSA[DSA / finance agents]
    INS[Insurance agents]
    WRK[Workshops]
    PARTS[Parts sellers]
    INF[Influencers]
  end

  C --> DISC
  B2B --> DISC
  DISC --> TRUST
  TRUST --> TRANS
  TRANS --> ENG
  DEAL & BRK & DSA & INS & WRK & PARTS & INF --> Platform
  ENG --> Monetization
  TRANS --> Monetization
```

### 8.2 Revenue streams

| Stream | Model | Timing | Dependency |
|--------|-------|--------|------------|
| **Dealer subscriptions** | Tiered SaaS (listings cap, CRM, analytics) | Mature | M2 hub + dealer CRM |
| **Broker subscriptions** | Seat-based CRM | Mature | Broker module |
| **Growth CRM** | Workspace plans + broadcast quotas | Near-term | L1 WhatsApp live |
| **Directory monetization** | Featured / sponsored / premium (K1) | Near-term | K1 + billing |
| **Auction fees** | Listing + success fee | Medium | Auction KYC gate |
| **Marketplace commission** | % on facilitated sale / lead | Medium | Escrow / agreements |
| **Finance / insurance referrals** | CPA per disbursed lead | Long | Partner banks |
| **Parts & services** | Take rate on GMV | Long | Checkout maturity |
| **Ads & brand** | Homepage, category takeovers | Medium | Traffic (M5 search) |

### 8.3 Subscription streams (packaging)

| Tier | Audience | Includes |
|------|----------|----------|
| Free | Small dealer | Limited listings, directory listing, community page |
| Pro | Active dealer | CRM leads, growth workspace, posters |
| Enterprise | Groups / OEM | Multi-location, API, auction partner, SLA |
| Broker Pro | Brokers | Pipeline, commissions, WhatsApp |
| Growth Add-on | Any business | Campaigns, L1 sends, L2 social |

### 8.4 Commission streams

| Transaction type | Typical take | Notes |
|------------------|--------------|-------|
| Vehicle sale facilitation | 0.5–2% or flat lead fee | Legal framework per state |
| Auction success | 1–3% buyer/seller side | Dispute + KYC policy |
| Finance referral | Fixed CPA ₹X–Y | Bank contracts |
| Insurance policy | % of premium | IRDAI compliance |
| Parts order | 8–15% marketplace | Logistics partner |

### 8.5 Growth opportunities

1. **Unified onboarding** (M1+M2) → higher activation vs siloed signups  
2. **Lead router** (M3) → more monetizable conversations per visitor  
3. **Search** (M5) → SEO + intent capture across verticals  
4. **WhatsApp + social** (L1+L2) → retention and campaign ROI for supply side  
5. **Directory K1** → land-and-expand for non-dealer businesses (workshops, DSA)  
6. **Auction cross-sell** → dealer inventory liquidation channel  
7. **Data asset** (anonymized) → pricing indices, regional demand (future)

### 8.6 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Module silos persist | Poor UX, duplicate data | M1–M2 program governance; ecosystem APIs |
| Lead duplication | Owner confusion | M3 canonical ID + dedupe rules |
| Compliance (finance/insurance) | Legal exposure | Keep referrals separate; clear disclosures |
| Auction fraud / shill bidding | Trust loss | Existing fraud admin + KYC gate |
| WhatsApp policy violations | Account ban | L1 template approval + opt-in |
| Scope creep on Prisma | Delivery delay | Metadata bridges until revenue proven |
| Broker/dealer module coupling | Regression | Flag-gated waves; no touch without approval |

### 8.7 Breakeven model (illustrative)

**Assumptions (replace with real ops data):**

| Variable | Year 1 placeholder |
|----------|-------------------|
| Paying dealers | 200 @ ₹2,999/mo avg |
| Growth workspaces | 150 @ ₹999/mo |
| Directory premium | 50 @ ₹1,499/mo |
| Auction + commission | ₹15L/mo blended |
| Team + infra burn | ₹18L/mo |

```text
MRR_subscriptions ≈ (200 × 2999) + (150 × 999) + (50 × 1499) ≈ ₹8.9L
MRR_transactions  ≈ ₹15L
MRR_total         ≈ ₹24L / month

Annual run-rate   ≈ ₹2.9 Cr

If burn = ₹18L/mo → breakeven when MRR_total ≥ burn
→ requires ~2× subscription scale OR ~1.2× commission lift vs above
→ realistic breakeven window: 18–30 months post unified launch (M1–M5 live)
```

Sensitivity: each +100 Pro dealers ≈ +₹3L MRR. Founder dashboard (M0) should track these KPIs when billing connects.

### 8.8 Investor positioning

**One-liner:**  
MotorCart is the **operating system for automotive commerce in India** — discovery, trust, transactions, and engagement in one account for every participant.

**Differentiation:**

- Not just classifieds (marketplace + auctions)  
- Not just social (community + directory)  
- Not just MarTech (growth CRM + WhatsApp + posters)  
- **Unified business graph** lowers CAC for supply and increases lead yield per visitor  

**Comparable narrative arcs:** vertical Shopify + LinkedIn + HubSpot for auto — with India-specific finance/insurance/partnership layers.

**Ask framing (example):** Seed/extension to complete M1–M5, activate monetization (K1+billing), and scale supply acquisition in 3 pilot cities.

---

## 9. Implementation roadmap (planning only)

| Phase | Scope | Depends on | Est. effort |
|-------|-------|------------|-------------|
| **M1** | Identity context API + switcher | Auth middleware | 2–3 sprints |
| **M2** | Business hub API + provisioning | M1, K2, J | 2–3 sprints |
| **M3** | Lead ingress + router + federated UI | M2, J4 | 3–4 sprints |
| **M4** | Notification aggregator + inbox UI | M1, M3 | 2 sprints |
| **M5** | Federated search v1 | M2, K2 | 2–3 sprints |
| **M6** | Investor metrics in M0 + billing | K1, subscriptions | Ongoing |

**Governance:** Each wave ships behind flags; smoke tests mirror K1/L1 pattern (off → 404).

**Explicit exclusions (per program rules):** No Prisma/db push in M1 planning phase; no broker/dealer/auction/community/marketplace file edits until a dedicated implementation approval names the wave.

---

## 10. Founder recommendations

1. **Prioritize M1 + M2 before M5** — identity and business graph unlock every other ROI story; search without correct ownership frustrates users.  
2. **Treat M3 as the revenue lever** — unified lead routing directly connects traffic to monetized CRM workflows (Growth + dealer).  
3. **Ship M4 early as “feel unified”** — even a read-only merge of existing notification tables improves perception before full realtime.  
4. **Keep broker and dealer CRM boundaries** — federate via events; avoid merging codebases without a dedicated refactor approval.  
5. **Activate K1 + billing before promising investor ARR** — M0 placeholders are honest; wire subscription counts when Razorpay/Stripe lands.  
6. **Pilot one city with one vertical** — e.g. Pune dealers: full loop signup → list → community → campaign → lead in inbox.  
7. **Document link hygiene** — every new feature must declare `entity_type` + `entity_id` or be rejected in architecture review.  
8. **Investor deck = this doc’s M6 diagrams** — use founder dashboard metrics as live appendix once flags on.

---

## 11. Deliverables checklist

| Deliverable | Section |
|-------------|---------|
| Final architecture diagram | §1 |
| Data flow diagram | §2 |
| Module relationships | §3 + per-module tables |
| M1 Unified Identity | §3 (M1) |
| M2 Unified Business | §4 |
| M3 Unified Lead Routing | §5 |
| M4 Unified Notifications | §6 |
| M5 Unified Search | §7 |
| M6 Investor blueprint | §8 |
| Revenue model | §8.2–8.4 |
| Investor narrative | §8.8 |
| Founder recommendations | §10 |
| Implementation plan (no code) | §9 |

---

## 12. Approval record

| Item | Value |
|------|-------|
| Phase | M1 Unified Ecosystem Architecture |
| Implementation in this PR/doc | **None** |
| Schema changes | **None** |
| Next gate | Per-wave implementation approval (M1.0, M2.0, …) |

**Status:** Ready for stakeholder review. No code or schema changes included.

# MotorCart — Automation Platform

**Modular workflow architecture — LangGraph, n8n, Temporal, queues**

---

## Design goals

1. Every automation is a **standalone module** with clear inputs/outputs
2. Long-running work never blocks HTTP requests
3. Workflows are **idempotent** and **retry-safe**
4. Compatible with external orchestrators (n8n, Temporal) via webhooks and queues

---

## Stack components

| Component | Role in MotorCart |
|-----------|-------------------|
| **Redis** | Cache, rate limits, job queues (Docker service exists) |
| **Background workers** | Node workers (extend backend — not monolithic cron in API process) |
| **Cron jobs** | Renewals, featured expiry, auction state transitions |
| **LangGraph** | Multi-step AI agents (recommendation, brochure OCR pipeline) |
| **n8n** | Ops automations, webhooks, non-code workflows |
| **Temporal** | Durable long workflows (finance approval chains, KYC) |
| **Workflow engine** | Internal state machine for leads, auctions, finance status |

---

## Automation categories

### Marketplace automations

- Featured listing expiry
- Price drop alerts
- Duplicate listing detection (AI)
- Inventory sync (new car daily stock — planned)

### Commerce automations

- Finance application routing to lenders
- Insurance renewal reminders
- Service booking confirmations (SMS/WhatsApp — planned)
- Auction auto-close and winner notification

### CRM automations

- Lead assignment rules
- SLA reminders (contact within X hours)
- WhatsApp template triggers (Growth CRM — planned)
- Commission calculation batches

### Platform automations

- KYC reminder sequences
- Fraud alert escalation
- Admin digest reports
- Search index sync (OpenSearch — planned)

### AI pipelines

- Brochure PDF → spec extraction → vehicle draft
- Image classification on upload
- Content generation for listings (SEO)
- Translation for regional listings

---

## Recommended architecture

```
Trigger (HTTP / Cron / Event)
    ↓
Queue (Redis / BullMQ / SQS-compatible)
    ↓
Worker service (backend/workers/ — add when implementing)
    ↓
Service layer (existing backend/src/services/)
    ↓
Database / External API / AI provider
```

**Webhook ingress:** `POST /api/webhooks/:provider` — validate signature, enqueue job, return 202.

---

## Event sources

| Event | Producer | Example automation |
|-------|----------|------------------|
| `lead.created` | POST /api/leads | Route to dealer CRM, notify |
| `vehicle.published` | vehicle API | Index search, AI enrich |
| `auction.bid` | Socket.io / API | Update room, anti-fraud check |
| `finance.submitted` | finance RPC | Lender webhook fan-out |
| `user.registered` | auth | Welcome, KYC prompt |

Implement as internal event bus or direct queue publish — start simple with queue + worker.

---

## n8n integration pattern

1. MotorCart exposes authenticated webhooks
2. n8n workflows call MotorCart APIs with service tokens
3. n8n handles third-party connectors (WhatsApp, email, sheets)

Do **not** embed n8n in the frontend.

---

## LangGraph / AI agent pattern

1. Agent defined in `backend/src/ai/agents/` or `frontend/src/ai/agents/` (existing stubs)
2. Prompts in DB or config — never hardcoded in UI
3. Tools call existing services (vehicle search, lead create)
4. Trace logs for audit

---

## Temporal (when needed)

Use for:

- Multi-day finance approval with human steps
- Auction dispute resolution
- Bulk catalog import with checkpoints

Not needed for simple cron or one-shot jobs.

---

## Security

- Webhook secrets per provider
- Service accounts for automation (not user JWT)
- Rate limit automation endpoints
- Audit log all automated mutations

---

## Implementation phases

| Phase | Deliverable |
|-------|-------------|
| 1 | Redis queue + one worker (lead notification) |
| 2 | Cron container or node-cron for renewals |
| 3 | Webhook routes + n8n templates |
| 4 | LangGraph pipeline for one AI flow |
| 5 | Temporal for finance approval (optional) |

See `21_Enterprise_Roadmap.md` Phase C–E.

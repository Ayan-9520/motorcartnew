# MotorCart — AI Agent Architecture

**Complete AI platform specification — modular, multi-provider, enterprise-grade**

---

## Principles

1. **Modular services** — one capability per service; independent deploy and test
2. **Configurable prompts** — DB/config store; **never hardcode in UI components**
3. **Multi-provider** — OpenAI, Anthropic, Gemini, future providers via adapter
4. **Observable** — log requests, latency, tokens, errors (audit-friendly)
5. **Safe defaults** — rate limit, validate inputs, sanitize user-visible outputs
6. **Queue long jobs** — OCR, bulk enrichment, embedding generation async

---

## Complete AI services catalog

Every service from the enterprise directive:

| # | Service | Purpose | Priority |
|---|---------|---------|----------|
| 1 | **Vehicle Recommendation AI** | Match buyers to inventory based on behavior + prefs | P1 |
| 2 | **Vehicle Comparison AI** | Structured multi-vehicle compare narratives + spec diff | P1 |
| 3 | **Brochure Reader AI** | Parse OEM PDF brochures into structured data | P2 |
| 4 | **OCR AI** | Extract text from images/documents (RC, insurance, etc.) | P2 |
| 5 | **Specification Extractor** | Normalize variant specs from unstructured sources | P2 |
| 6 | **Image Classification AI** | Vehicle type, angle, damage, quality scoring | P2 |
| 7 | **Duplicate Detection AI** | Same vehicle listed multiple times / fraud | P1 |
| 8 | **Variant Detection AI** | Identify trim/variant from photos or text | P2 |
| 9 | **Pricing Intelligence AI** | Market-aware price suggestions for dealers | P1 |
| 10 | **Inventory Intelligence AI** | Stock aging, reorder, demand signals for dealers | P2 |
| 11 | **Dealer Assistant AI** | In-workspace help for CRM, inventory, leads | P2 |
| 12 | **Customer Assistant AI** | Shopper guidance on marketplace/finance/insurance | P2 |
| 13 | **Ownership Cost AI** | TCO — fuel, service, insurance, depreciation | P2 |
| 14 | **Market Intelligence AI** | Trends, demand by region/category | P3 |
| 15 | **Analytics AI** | Natural language queries on platform analytics | P3 |
| 16 | **SEO AI** | Listing titles, meta, structured data generation | P2 |
| 17 | **Translation AI** | Regional language listing/content translation | P3 |
| 18 | **Content Generation AI** | Descriptions, posts, marketing copy | P2 |
| 19 | **Fraud Detection AI** | Listings, leads, payments anomaly detection | P1 |
| 20 | **Predictive Pricing AI** | Future price trajectory / auction reserve hints | P3 |

---

## Existing codebase entry points

| Path | Purpose |
|------|---------|
| `frontend/src/ai/` | AI pages, agents, client services |
| `frontend/src/features/platform-admin/pages/SuperAdminAIPage.tsx` | Admin AI control |
| `frontend/src/ai/pages/AIControlCenterPage.tsx` | Control center UI |
| `backend/src/` (agents if present) | Server-side AI execution (preferred for keys) |

**Rule:** Extend AI control center — do not create parallel admin AI UIs.

---

## Provider adapter pattern

```typescript
interface AIProvider {
  id: "openai" | "anthropic" | "gemini" | string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  embed?(text: string): Promise<number[]>;
}

interface AIServiceConfig {
  providerId: string;
  model: string;
  promptTemplateId: string;
  maxTokens: number;
  temperature: number;
}
```

- Keys **server-side only** — never `VITE_*` for provider secrets in production
- Block client-side OpenAI calls in prod builds (SEC-007)
- Fallback provider optional — log when switching

---

## Prompt management

Store in PostgreSQL table (planned):

```
ai_prompt_templates (id, slug, version, system_prompt, user_template, variables_schema, active)
ai_service_configs (id, service_slug, provider_id, model, prompt_template_id, params_json)
ai_request_logs (id, service_slug, user_id, tokens, latency_ms, status, created_at)
```

Never hardcode prompts in React components.

---

## Vector / embedding strategy

| Use case | Store |
|----------|-------|
| Semantic vehicle search | pgvector on vehicle embeddings |
| Brochure chunks | Vector DB partition per OEM |
| Support/knowledge base | Embeddings + retrieval |

Sync from PostgreSQL — vectors are index, not source of truth.

---

## Agent architecture (LangGraph-ready)

```
Agent
 ├── Tools (call existing MotorCart services)
 │    ├── searchVehicles()
 │    ├── getVehicleDetail()
 │    ├── createLead()
 │    └── getFinanceQuote()
 ├── Memory (session + optional user prefs)
 └── Planner (multi-step — LangGraph graph)
```

Agents invoke **existing APIs** — no duplicate business logic in agent layer.

---

## Data flow

```
User/UI
  → POST /api/ai/:service
  → Auth + rate limit
  → AIServiceRouter
  → Provider adapter
  → Optional: Vector retrieval (pgvector)
  → Response + audit log

Long-running:
  → Enqueue Redis job
  → Worker processes
  → Webhook/poll for result
```

---

## Automation integration

See `14_Automation_Platform.md` for LangGraph, n8n, Temporal, queues.

AI outputs can trigger automations:

- `listing.enriched` → re-index search
- `fraud.flagged` → admin alert
- `brochure.parsed` → draft vehicle created

---

## Security

- RBAC: super_admin + designated roles for AI admin
- PII redaction before external model calls
- Rate limits per user/IP/service
- Audit all admin prompt changes
- Content moderation on generated public text

---

## Implementation roadmap

| Phase | Deliverable |
|-------|-------------|
| F1 | Provider adapter + config env | 
| F2 | Prompt template table + admin UI hook |
| F3 | Vehicle recommendation v1 (rule + embedding hybrid) |
| F4 | Duplicate detection on new listing submit |
| F5 | Brochure OCR worker pipeline |
| F6 | Dealer/customer assistant with tool calling |
| F7 | Full LangGraph agent for complex flows |

Track in `10_Sprint_Backlog.md` (P3-06 through P3-09).

---

## Testing AI features

- Golden tests for prompt templates (snapshot expected structure, not live API)
- Integration tests with mocked provider
- Cost caps in dev/staging environments
- Human review gate for production prompt changes

---

## Related

- `14_Automation_Platform.md`
- `15_Performance_and_Scalability.md`
- `22_Security_Risk_Register.md` (SEC-007)

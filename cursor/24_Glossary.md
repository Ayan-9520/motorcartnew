# MotorCart — Glossary

| Term | Definition |
|------|------------|
| **MotorCart** | India's AI-Powered Automotive Operating System (brand — capital C) |
| **Automotive OS** | Unified platform connecting all vehicle ecosystem participants |
| **Hub** | Vehicle category landing (cars, bikes, EV, trucks, etc.) |
| **Workspace** | Role-specific dashboard shell (dealer, DSA, super-admin, etc.) |
| **AppRole** | User role enum in `types/database.ts` |
| **Generic query** | `/api/db/query` — table CRUD compatibility layer |
| **RPC** | `/api/db/rpc/[fn]` — server-side multi-step operations |
| **motorcartApi** | Frontend REST client (alias name: supabase client path) |
| **Mock catalog** | Large static vehicle dataset merged with DB in browse |
| **getVehiclePool()** | Function merging mock + DB vehicles for listings |
| **MERGE data** | UI showing combination of mock and real records |
| **Demo fallback** | `VITE_ADMIN_DEMO_FALLBACK` — admin mock when API empty |
| **Placeholder page** | `NcdModulePlaceholder` — shell UI without backend |
| **Lead** | Customer enquiry captured via `POST /api/leads` |
| **dealer_leads** | New-car dealer specific lead table |
| **Business account** | Dealer/business signup pending approval |
| **KYC** | Know Your Customer verification workflow |
| **DSA** | Direct Selling Agent — finance lead partner |
| **NBFC** | Non-Banking Financial Company — lender role |
| **ERP** | Enterprise Resource Planning — parts/service dealer consoles |
| **Featured inventory** | Paid/promoted vehicle listings |
| **Sale mode** | Planned: owner / broker / dealer / auction listing type |
| **Proxy bid** | Auction auto-bid up to max (planned) |
| **Growth CRM** | Marketing automation — WhatsApp, social, reels (planned) |
| **Community subdomain** | Future `community.motorcart.in` deploy |
| **Prisma** | ORM — schema source of truth |
| **Socket.io** | Realtime layer for auctions |
| **Lazy page** | Dynamic import in `lazy-pages.tsx` for code splitting |
| **ProtectedRoute** | Frontend auth guard component |
| **allowlist** | Security: permitted DB tables per role on query API |
| **Soft delete** | `deletedAt` timestamp instead of hard delete |
| **pgvector** | PostgreSQL vector extension for AI embeddings (planned) |
| **LangGraph** | Multi-step AI agent framework (planned integration) |
| **n8n** | Workflow automation tool via webhooks (planned) |
| **Temporal** | Durable workflow engine for long processes (planned) |
| **Extend only** | Master rule — add capabilities without replacing working code |
| **P0/P1/P2/P3** | Priority levels — P0 critical, P3 future |

---

## Abbreviations

| Abbr | Meaning |
|------|---------|
| CRM | Customer Relationship Management |
| OEM | Original Equipment Manufacturer |
| EV | Electric Vehicle |
| VIN | Vehicle Identification Number |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| SLA | Service Level Agreement |
| USP | Unique Selling Proposition |
| SPA | Single Page Application |
| FK | Foreign Key |
| PII | Personally Identifiable Information |

---

## File alias warnings

| Misleading name | Actual meaning |
|-----------------|----------------|
| `integrations/supabase/client` | MotorCart REST API client — not Supabase |
| `preowned_dealer` | Legacy role → normalized to dealer workspace |
| `service_partner` | Legacy role → `service_center` |

---

## Related

- `12_Core_Modules_Catalog.md`
- `16_Roles_and_Permissions.md`
- `00_Master_Directive.md`

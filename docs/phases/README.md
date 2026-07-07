# Motorcart phase documentation

Internal planning and implementation logs — **not** runtime code.

| Prefix | Meaning |
|--------|---------|
| **B–F** | Early modules: vehicles, finance (C), insurance (D), broker (E), auctions (F) |
| **I** | Insurance / enterprise extensions |
| **J** | Growth engine (WhatsApp, social, designs) |
| **K, M** | Unified ecosystem, lead router, search, notifications |
| **N** | Billing, WhatsApp commercial, finance/insurance marketplace plans |
| **O, S** | Strategic expansion blueprint, production readiness audit |

Each phase typically has:

- `*-PLAN.md` — architecture before code
- `*-DATABASE.md` / `*-SCHEMA-DIFF.md` — DDL review before `db push`
- `*-APPLIED-RESULTS.md` — what was actually shipped

For day-to-day dev, use [DEV-START.md](../../DEV-START.md) and [backend/docs/SETUP.md](../../backend/docs/SETUP.md).

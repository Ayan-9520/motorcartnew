# MotorCart — Enterprise AI Documentation

**Version 2.0 Premium · Complete Enterprise Suite**

This folder is the **authoritative source of truth** for all AI-assisted and human development on MotorCart.

**Document count:** 37 files (00–37).

---

## Mandatory instruction (every session)

> Before making any code changes, read every document in this `/cursor` directory (or the task-relevant subset) and treat these documents as the authoritative source of truth. If there is any conflict between your assumptions and the documentation, **the documentation always takes precedence**.

Follow `00_Master_Directive.md` as the supreme engineering directive.

---

## Quick navigation

| I want to… | Read |
|------------|------|
| Understand the rules | [00_Master_Directive.md](./00_Master_Directive.md) |
| Start coding today | [25_Developer_Quick_Start.md](./25_Developer_Quick_Start.md) |
| See all modules | [12_Core_Modules_Catalog.md](./12_Core_Modules_Catalog.md) |
| Know mock vs real data | [23_Mock_vs_Real_Data_Matrix.md](./23_Mock_vs_Real_Data_Matrix.md) |
| Plan a sprint | [21_Enterprise_Roadmap.md](./21_Enterprise_Roadmap.md) + [10_Sprint_Backlog.md](./10_Sprint_Backlog.md) |
| Add a new feature | [20_Feature_Documentation_Template.md](./20_Feature_Documentation_Template.md) |
| Fix security | [22_Security_Risk_Register.md](./22_Security_Risk_Register.md) |

---

## Complete document index (37 files)

### Core directive

| # | File | Contents |
|---|------|----------|
| 00 | [Master_Directive.md](./00_Master_Directive.md) | Enterprise master prompt — role, prohibited, required, vision |
| 01 | [Coding_Standards.md](./01_Coding_Standards.md) | Frontend/backend conventions, naming, imports |
| 02 | [System_Architecture.md](./02_System_Architecture.md) | Repo layout, stack, modules overview |

### Domain & product

| # | File | Contents |
|---|------|----------|
| 11 | [Product_Vision_and_Positioning.md](./11_Product_Vision_and_Positioning.md) | OS vision, ecosystem, pillars, brand |
| 12 | [Core_Modules_Catalog.md](./12_Core_Modules_Catalog.md) | Every module, route, path, status |
| 13 | [Vehicle_Categories_and_Hubs.md](./13_Vehicle_Categories_and_Hubs.md) | All vehicle types, hubs, dealer roles |
| 24 | [Glossary.md](./24_Glossary.md) | Terminology and abbreviations |

### Technical deep dives

| # | File | Contents |
|---|------|----------|
| 03 | [Database_Guidelines.md](./03_Database_Guidelines.md) | Prisma, migrations, query API |
| 04 | [AI_Agent_Architecture.md](./04_AI_Agent_Architecture.md) | AI services, providers, pipelines |
| 05 | [API_Standards.md](./05_API_Standards.md) | REST, JWT, RBAC, versioning |
| 06 | [UI_Guidelines.md](./06_UI_Guidelines.md) | Design system — extend only |
| 07 | [Security_Standards.md](./07_Security_Standards.md) | Auth, validation, secrets |
| 08 | [DevOps_Guidelines.md](./08_DevOps_Guidelines.md) | Docker, build, deploy |
| 09 | [Testing_Guidelines.md](./09_Testing_Guidelines.md) | Unit, integration, manual QA |
| 14 | [Automation_Platform.md](./14_Automation_Platform.md) | LangGraph, n8n, Temporal, queues |
| 15 | [Performance_and_Scalability.md](./15_Performance_and_Scalability.md) | 10M user targets, bottlenecks |
| 16 | [Roles_and_Permissions.md](./16_Roles_and_Permissions.md) | AppRole matrix, guards |
| 17 | [Frontend_Architecture.md](./17_Frontend_Architecture.md) | React, router, state, features |
| 18 | [Backend_Architecture.md](./18_Backend_Architecture.md) | API routes, Prisma, Socket.io |
| 19 | [Mobile_Applications.md](./19_Mobile_Applications.md) | Expo customer app |

### Operations & planning

| # | File | Contents |
|---|------|----------|
| 10 | [Sprint_Backlog.md](./10_Sprint_Backlog.md) | Prioritized tasks tracker |
| 20 | [Feature_Documentation_Template.md](./20_Feature_Documentation_Template.md) | Template for every new feature |
| 21 | [Enterprise_Roadmap.md](./21_Enterprise_Roadmap.md) | Phases A–G, priority matrix |
| 22 | [Security_Risk_Register.md](./22_Security_Risk_Register.md) | Active risks + mitigations |
| 23 | [Mock_vs_Real_Data_Matrix.md](./23_Mock_vs_Real_Data_Matrix.md) | What's mock vs DB-backed |
| 25 | [Developer_Quick_Start.md](./25_Developer_Quick_Start.md) | 15-minute onboarding |
| 26 | [Quotations.md](./26_Quotations.md) | Phase 5A quotation engine |
| 27 | [Test_Drives.md](./27_Test_Drives.md) | Phase 5B real test-drive product |
| 28 | [Stock_By_PIN.md](./28_Stock_By_PIN.md) | Phase 5C exact PIN stock discovery |
| 29 | [Community.md](./29_Community.md) | Batch 6 real community & professional network |
| 30 | [Sales_OS_Lead_Board.md](./30_Sales_OS_Lead_Board.md) | Batch 7 Sales OS, PIN routing, Lead Board |
| 31 | [Revenue_Billing_Payouts_Loyalty.md](./31_Revenue_Billing_Payouts_Loyalty.md) | Batch 8 commercial engine, payouts, rewards ledger |
| 32 | [Customer_SuperApp_MotorCartOne_Valuation.md](./32_Customer_SuperApp_MotorCartOne_Valuation.md) | Batch 9 super-app, MotorCart One, used-vehicle trust, valuation |
| 33 | [Communication_AI_Sales_OS.md](./33_Communication_AI_Sales_OS.md) | Batch 10 Communication OS, dialer, AI sales agent |
| 34 | [Partner_Industry_OS.md](./34_Partner_Industry_OS.md) | Batch 11 Partner / Industry OS |
| 35 | [Final_Platform_Gap_Audit.md](./35_Final_Platform_Gap_Audit.md) | Batch 12 gap audit |
| 36 | [Production_Runbook.md](./36_Production_Runbook.md) | Backup, migrate, flags, incidents |
| 37 | [Launch_Readiness.md](./37_Launch_Readiness.md) | Flags, env, launch classification |

---

## Master prompt coverage checklist

Every section from the Enterprise Master Prompt is documented:

| Master prompt section | Document |
|-----------------------|----------|
| Role & most important rule | 00 |
| Strictly prohibited / Required | 00, 06 |
| Project & product vision | 00, 11 |
| Core modules | 12 |
| Vehicle categories | 13 |
| AI platform (all 20+ services) | 04 |
| Automation platform | 14 |
| Technology stack | 02, 17, 18 |
| Software engineering principles | 01 |
| Database rules | 03 |
| Security | 07, 16, 22 |
| Performance | 15 |
| Development process | 00, 25 |
| Before/after modifying files | 00, 20 |
| Never assume | 00, 23 |
| Documentation requirements | 20 |
| Testing | 09 |
| AI development (providers) | 04 |
| Scalability | 15 |
| Positioning | 11 |
| Final rule | 00 |

---

## Related repository documentation

| Path | Purpose |
|------|---------|
| `PROJECT-AUDIT-ENTERPRISE.md` | Full technical audit (2026) |
| `docs/phases/` | Database migration phase history |
| `DOCKER.md` | Container reference |
| `backend/docs/SETUP.md` | Database setup |
| `frontend/DEPLOY.md` | Static deploy guide |

---

## Cursor IDE integration

| File | Purpose |
|------|---------|
| `.cursor/rules/motorcart-enterprise.mdc` | Always-on agent rule |
| `AGENTS.md` (repo root) | Pointer to this folder |

---

## Maintenance

When shipping any feature:

1. Update `12_Core_Modules_Catalog.md` status
2. Update `23_Mock_vs_Real_Data_Matrix.md` if data source changes
3. Mark tasks done in `10_Sprint_Backlog.md`
4. Use `20_Feature_Documentation_Template.md` for architecture notes

**MotorCart is India's AI-Powered Automotive Operating System. Build accordingly.**

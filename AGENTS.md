# MotorCart — AI Agents & Developers

**MotorCart is India's AI-Powered Automotive Operating System.**

This is an **existing production codebase**. Extend only — do not rewrite.

---

## Start here

All engineering rules, architecture, and planning live in:

### → [`cursor/README.md`](./cursor/README.md)

**Before any code change**, read the relevant documents in `/cursor`. Documentation overrides assumptions.

Supreme directive: [`cursor/00_Master_Directive.md`](./cursor/00_Master_Directive.md)

Quick start: [`cursor/25_Developer_Quick_Start.md`](./cursor/25_Developer_Quick_Start.md)

---

## Repository layout

```
motorcartcursor/
├── cursor/           ← Enterprise AI documentation (26 docs)
├── frontend/         ← React 19 SPA (primary UI)
├── backend/          ← Next.js API + Prisma + PostgreSQL
├── apps/mobile-customer/  ← Expo mobile app
├── docs/phases/      ← DB migration history
└── docker-compose.yml
```

---

## Non-negotiable rules

1. **Do not modify existing features** unless explicitly requested
2. **Do not change UI/design** unless explicitly requested
3. **Reuse** existing services — no duplicate modules
4. **Prisma migrations** for all schema changes
5. **Commit only when the user asks**

---

## Cursor rule

`.cursor/rules/motorcart-enterprise.mdc` — always applied in Cursor IDE.

---

## Key references

| Doc | Path |
|-----|------|
| Technical audit | `PROJECT-AUDIT-ENTERPRISE.md` |
| Module catalog | `cursor/12_Core_Modules_Catalog.md` |
| Mock vs real | `cursor/23_Mock_vs_Real_Data_Matrix.md` |
| Roadmap | `cursor/21_Enterprise_Roadmap.md` |
| Security risks | `cursor/22_Security_Risk_Register.md` |

---

## Run locally

```powershell
docker compose up -d
# App: http://localhost:3000
```

See `cursor/25_Developer_Quick_Start.md` for full instructions.

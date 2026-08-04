# MotorCart — Coding Standards

**Applies to:** All new and modified code in this repository

---

## General

- **Extend, don't replace.** Match naming, imports, and folder layout of neighboring files.
- **TypeScript strictness:** Prefer explicit types on public APIs; avoid `any` unless bridging legacy code.
- **No duplicate services.** Search `frontend/src/services`, `frontend/src/features/*/services`, and `backend/src/services` before creating new modules.
- **Small, focused diffs.** One concern per change unless the user explicitly requests a batch refactor.

---

## Frontend (`frontend/`)

| Convention | Location / pattern |
|------------|-------------------|
| UI components | `frontend/src/components/ui/` (shadcn-style) |
| Feature modules | `frontend/src/features/<feature>/` |
| Pages | `features/*/pages/` or `pages/` for top-level |
| Hooks | `hooks/` or colocated `features/*/hooks/` |
| API clients | `services/` or `features/*/services/` |
| State | Zustand stores in `store/`, server state via TanStack Query |
| Routing | `frontend/src/router/index.tsx` + `lazy-pages.tsx` for code splitting |
| Styling | Tailwind + `frontend/src/theme/global.css` utility classes |
| Utils | `@/lib/utils` — use `cn()` for class merging |

**Imports:** Use `@/` path alias (maps to `frontend/src/`).

**Components:** Functional components only. Extract hooks when logic is reused or a component exceeds ~150 lines.

**Do not** change global theme tokens, spacing scale, or component variants unless explicitly requested.

---

## Backend (`backend/`)

| Convention | Location / pattern |
|------------|-------------------|
| API routes | `backend/src/app/api/` (Next.js App Router) |
| Services | `backend/src/services/` |
| Prisma | `backend/prisma/schema.prisma` |
| Auth | JWT access + refresh; guards in route handlers |
| Generic CRUD | `POST/GET/PATCH/DELETE /api/db/query` — prefer dedicated routes for new public APIs |
| RPC | `POST /api/db/rpc/[fn]` for complex operations |
| Uploads | `POST /api/upload`, served from `/uploads` |

**Validation:** Validate request bodies at route boundary; use service layer for business rules.

**Errors:** Return consistent JSON `{ error: string }` with appropriate HTTP status codes.

---

## File naming

- React components: `PascalCase.tsx`
- Hooks: `useSomething.ts`
- Services: `something.service.ts`
- Types: `types.ts` or colocated in feature folder

**Do not rename** existing files or folders without explicit user approval.

---

## Git & commits

- Commit only when the user asks.
- Never commit secrets (`.env`, credentials).
- Follow existing commit message style in repo history.

---

## Code review checklist (self)

- [ ] Reused existing abstractions
- [ ] No breaking changes to routes or APIs
- [ ] Lint and TypeScript pass
- [ ] Build passes (`npm run build` in `frontend/` and `backend/` as applicable)

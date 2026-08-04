# MotorCart — Frontend Architecture (Deep Dive)

---

## Stack

| Technology | Version / usage |
|------------|-----------------|
| React | 19 — functional components |
| TypeScript | Strict project references |
| Vite | 6 — dev server + production build |
| React Router | 7 — SPA routing |
| TanStack Query | Server/async state |
| Zustand | Client global state (vehicles, UI) |
| TailwindCSS | Utility-first + `global.css` layers |
| shadcn/ui | `components/ui/` |
| Lucide | Icons |
| Framer Motion | Animations (vendor-motion chunk) |
| Axios | HTTP via `@/integrations/supabase/client` alias → REST |

---

## Directory structure

```
frontend/src/
├── ai/                    # AI control center, agents, services
├── components/            # Shared UI, layout, auth, brand
├── dashboards/            # Dashboard shells, sidebars, mobile nav
├── features/              # Domain modules (primary organization)
├── hooks/                 # Global hooks
├── integrations/          # API client (supabase naming = REST)
├── layouts/               # PublicLayout, CommunityLayout, AuthLayout
├── lib/                   # utils, helpers
├── pages/                 # Top-level pages (home, pricing, etc.)
├── permissions/           # RBAC matrix
├── router/                # index.tsx, lazy-pages, admin-pages
├── services/              # Cross-feature services
├── store/                 # Zustand stores
├── theme/                 # global.css, theme tokens
└── types/                 # database.ts, shared types
```

**Rule:** New domain code goes in `features/<domain>/` — not loose in `pages/` unless top-level marketing page.

---

## Routing architecture

| File | Role |
|------|------|
| `router/index.tsx` | Master route tree (~1100 lines) |
| `router/lazy-pages.tsx` | Dynamic imports for heavy pages |
| `router/admin-pages.ts` | Super-admin static imports |
| `layouts/PublicLayout.tsx` | Navbar + main + Footer |
| `layouts/CommunityLayout.tsx` | Community shell + mobile bar |

**Scroll:** `ScrollToTop` on route change (root wrapper).

**Protected routes:** Wrap with `ProtectedRoute` + role check.

---

## Layout hierarchy

```
PublicLayout
  ├── Navbar (2-layer: logo+vehicles+search / nav links)
  ├── site-main
  │     └── Outlet (pages)
  ├── Footer (hidden on /community/*)
  └── FloatingButtons (hidden on /community/*)

CommunityLayout (nested under /community)
  ├── desktop rail (lg+)
  ├── community-app-main
  └── mobile bottom bar (lg hidden)

Dashboard layouts
  ├── RoleSidebar + DashboardMobileNav
  └── Feature outlet
```

---

## State management patterns

| Use case | Tool |
|----------|------|
| API data | TanStack Query hooks in `features/*/hooks/` |
| Auth session | `AuthProvider`, `useAuth` |
| Vehicle marketplace | `vehicleMarketStore` (Zustand) |
| UI ephemeral | `useState`, `useReducer` |
| Theme | `ThemeContext` |

---

## API client pattern

```typescript
// Typical service call
import { motorcartApi } from "@/integrations/supabase/client";

export async function fetchLeads() {
  const { data } = await motorcartApi.from("leads").select("*");
  return data;
}
```

The `supabase` naming is a **compatibility alias** for REST — not Supabase SDK.

For new features, prefer typed service modules in `features/*/services/`.

---

## Styling system

- **Tailwind** for layout and spacing
- **global.css** — `@layer components` for premium patterns:
  - `.community-app-*`, `.site-nav-*`, hub heroes, etc.
- **cn()** from `@/lib/utils` for conditional classes
- **Do not** change design tokens without explicit request

---

## Code splitting strategy

Already split:

- `vendor-react`, `vendor-charts`, `vendor-xlsx`, `vendor-motion`, `vendor-api`, `vendor-table`

Add lazy imports for:

- New admin pages
- Heavy editors (growth design editor)
- Rarely used ERP subpages

---

## Mobile architecture

- `NavbarMobileDrawer` — portal drawer, logout in footer
- Per-role `*MobileNav.tsx` — single close button
- Community: fixed bottom bar at `bottom: 0` (see `06_UI_Guidelines.md`)
- Admin: scroll-to-top on navigation

---

## Feature module anatomy

```
features/example/
├── components/     # UI pieces
├── pages/          # Route targets
├── hooks/          # useExample*
├── services/       # API layer
├── lib/            # Pure helpers
├── data/           # Static mock/config
└── index.ts        # Public exports (optional)
```

---

## Build & env

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL |
| `VITE_BASE_PATH` | Subfolder deploy |
| `VITE_FULL_ECOSYSTEM` | Feature flag |
| `VITE_ADMIN_DEMO_FALLBACK` | Admin mock data |

Build: `npm run build` → `dist/`

---

## Anti-patterns (prohibited)

- Duplicating feature folders (`parts/` vs `parts-supplier/` — use supplier for ERP)
- Importing xlsx at top level of router
- Hardcoding API URLs
- Creating parallel auth systems
- Global CSS resets that break existing pages

---

## Key files reference

| Concern | File |
|---------|------|
| Auth | `components/auth/AuthProvider.tsx` |
| Navbar | `components/layout/Navbar.tsx` |
| Permissions | `permissions/matrix.ts` |
| Vehicle hubs | `features/ecosystem/` |
| Meta/SEO | `lib/setPageMeta` |

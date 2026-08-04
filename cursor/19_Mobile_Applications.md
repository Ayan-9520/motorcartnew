# MotorCart — Mobile Applications

---

## Overview

| App | Location | Stack | Status |
|-----|----------|-------|--------|
| Customer mobile | `apps/mobile-customer/` | Expo / React Native | 🏗️ In development |
| Web (responsive) | `frontend/` | React SPA | ✅ Primary — mobile-first Tailwind |

**Strategy:** Web SPA is the main customer surface; native app extends key workflows (login, vehicles, workspace, profile).

---

## Customer mobile app (`apps/mobile-customer/`)

### Structure

```
apps/mobile-customer/
├── App.tsx                 # Root
├── src/
│   ├── api/                # auth, client, vehicles, crm, workspace
│   ├── auth/AuthContext.tsx
│   ├── navigation/RootNavigator.tsx
│   ├── screens/            # Home, Login, Vehicles, Profile, Workspace
│   ├── theme.ts
│   └── ui/MotorcartLogo.tsx
├── Dockerfile              # Optional web/nginx build
├── app.json                # Expo config
└── package.json
```

### Screens (current)

- Login
- Home
- Vehicles list + detail
- Workspace
- Profile

### API integration

- Uses same backend JWT auth as web
- `src/api/client.ts` — base URL from env
- Reuse API contracts from web — do not duplicate backend logic in app

### Env

Copy `apps/mobile-customer/.env.example` — set API URL to backend (local or prod).

---

## Web mobile experience (production today)

Most users on mobile use the responsive SPA:

| Area | Mobile pattern |
|------|----------------|
| Public nav | `NavbarMobileDrawer` |
| Dashboards | `*MobileNav.tsx` drawers |
| Community | Bottom tab bar in `CommunityLayout` |
| Hubs | Vehicle icon bar + compact search |

**Do not** add global bottom nav on public pages — drawer pattern is canonical.

---

## Mobile development rules

1. **Extend** existing API — no mobile-only duplicate endpoints unless offline sync requires it
2. Match **Motorcart brand** — logo assets in `assets/motorcart-*.png`
3. Share **types** with web where possible (consider `packages/shared-types` in future — not required yet)
4. Auth tokens — same JWT flow; secure storage on device (Expo SecureStore — implement when hardening)
5. Do not break web when changing shared backend

---

## Docker (mobile web preview)

`apps/mobile-customer/Dockerfile` + `nginx.conf` — optional static preview.

Primary deploy target remains Expo build (EAS) or app stores — document when ready.

---

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| M1 | Login + vehicle browse (current) |
| M2 | Push notifications via backend |
| M3 | Lead enquiry from app |
| M4 | Dealer workspace read-only |
| M5 | App store release + deep links |

---

## Testing mobile

- Expo: `npx expo start` in `apps/mobile-customer/`
- Web responsive: Chrome DevTools 400px width
- Verify API URL reaches Docker nginx on port 3000

---

## Related

- `06_UI_Guidelines.md` — web mobile patterns
- `05_API_Standards.md` — auth headers
- `08_DevOps_Guidelines.md` — Docker stack

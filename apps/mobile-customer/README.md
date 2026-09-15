# Motorcart Customer App (Expo) — Play Store ready

Package: **`in.motorcart.app`** · Same JWT API as [motorcart.in](https://motorcart.in)

---

## Code status (already done in repo)

| Item | Status |
|------|--------|
| Package ID `in.motorcart.app` | ✅ |
| Production EAS → `https://motorcart.in`, demos **off**, **AAB** | ✅ `eas.json` |
| Icons / adaptive / splash / store graphics | ✅ `assets/` + `store/` |
| Privacy + Terms in-app + on web | ✅ `motorcart.in/privacy` · `/terms` |
| Tokens in SecureStore | ✅ |
| HTTPS cleartext off for prod | ✅ `app.config.js` |
| Typecheck | ✅ |
| EAS `projectId` | ❌ run `eas init` (you) |
| Play Console app + AAB upload | ❌ (you) |

---

## Services you must buy / open (money)

| # | Service | Cost (approx) | Why |
|---|---------|---------------|-----|
| 1 | **Google Play Console** developer account | **$25 USD one-time** | Only way to publish on Play Store |
| 2 | **Expo account** + **EAS Build** | Free tier usually enough | Cloud Android AAB build (no Android Studio needed) |
| 3 | Domain / VPS / API | Already: **motorcart.in** | App talks to your live API |
| 4 | Apple Developer (optional later) | $99/year | Only if you want **iOS App Store** — not required for Play |

You do **not** need: Firebase (unless you add FCM push later), AdMob, or a separate Android signing key — EAS manages keystore.

---

## Step-by-step: link everything + upload

### A) Google Play Console (browser)

1. Open [play.google.com/console](https://play.google.com/console) → pay **$25** → create developer account (use business email).
2. **Create app**
   - App name: `Motorcart`
   - Default language: English (India) or Hindi + English
   - App / Game: **App**
   - Free / Paid: **Free**
   - Declarations: accept policies
3. After create → **Dashboard** → complete:
   - **Store listing** — paste from `store/LISTING.md`
   - Upload `store/icon-512.png`, `store/feature-graphic.png`
   - Add **≥2 phone screenshots** (take from preview APK or emulator)
   - **Privacy policy URL:** `https://motorcart.in/privacy`
   - Category: **Business** (or Auto & Vehicles)
4. **App content**
   - Privacy policy
   - **Data safety** — see `store/LISTING.md` (email/name/phone for account; not sold; HTTPS)
   - Content rating questionnaire (complete honestly)
   - Target audience / news / COVID etc. as asked
5. **Countries** — select India (and others if needed)
6. Leave **Production** empty until AAB is ready — use **Internal testing** first.

### B) Expo / EAS (your Windows PC)

```powershell
npm install -g eas-cli
cd E:\Projects\motorcartcursor\apps\mobile-customer
npm install
npx eas login
npx eas init
```

- `eas init` writes a real **`projectId`** into `app.json` → `expo.extra.eas.projectId`
- **Commit that one line** to git

Or run the helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\play-store-build.ps1
```

### C) Build production AAB

```powershell
cd E:\Projects\motorcartcursor\apps\mobile-customer
npx eas build -p android --profile production
```

- Wait for Expo cloud build → download **`.aab`**
- This AAB already points API to `https://motorcart.in` (see `eas.json`)

Optional preview APK for screenshots:

```powershell
npx eas build -p android --profile preview
```

### D) Upload AAB to Play Console

1. Play Console → your app → **Testing → Internal testing**
2. **Create release** → upload the `.aab`
3. Add release notes (e.g. `1.0.0 — Initial Motorcart companion`)
4. **Save → Review → Start rollout to Internal testing**
5. Add yourself as tester (email) → install from Play invite link → QA login with real motorcart.in account
6. When OK → **Production** → create release from same AAB (or promote) → Submit for review

### E) Optional: auto-submit from EAS

1. Google Cloud Console → create **Service Account**
2. Play Console → **Users and permissions** → invite that SA with **Release to production / testing** rights
3. Enable **Google Play Android Developer API**
4. Download JSON key → save as  
   `apps/mobile-customer/google-play-service-account.json`  
   (**gitignored — never commit**)
5. Then:

```powershell
npx eas submit -p android --profile production --latest
```

### F) Deep links (after first signed build)

1. Play Console → **App integrity / App signing** → copy **SHA-256** certificate fingerprint  
   (or from Expo credentials after build)
2. Put it in `frontend/public/.well-known/assetlinks.json` (replace `REPLACE_WITH_EAS_OR_PLAY_APP_SIGNING_SHA256`)
3. Redeploy **frontend** so `https://motorcart.in/.well-known/assetlinks.json` is live
4. App can then open `https://motorcart.in/app/...` links

---

## How pieces link together

```
Phone app (in.motorcart.app)
    │  HTTPS JWT
    ▼
https://motorcart.in  (nginx → backend API)
    │
    ├── /privacy  /terms   ← Play policy URLs
    ├── /api/auth/*        ← same login as website
    └── /.well-known/assetlinks.json  ← App Links (after SHA)

Expo EAS projectId  ←→  builds AAB
Play Console package in.motorcart.app  ←→  accepts that AAB
```

---

## Real login (no demo)

Production builds have demo logins **off**.

- New user: app Sign up → Customer/Business  
- Existing: same email/password as motorcart.in  

---

## Local Expo (dev only — not for store)

```powershell
cd apps/mobile-customer
copy .env.example .env
npm install
npx expo start
```

Docker `:8090` web preview ≠ Play binary. Store = **EAS AAB only**.

---

## Related

- `store/LISTING.md` — paste pack + Data safety notes  
- `cursor/19_Mobile_Applications.md` — architecture  
- `play-store-build.ps1` — login → init → production build  

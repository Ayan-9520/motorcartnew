# Motorcart Customer App (Expo) — Play Store ready

Package: `in.motorcart.app` · Same JWT API as [motorcart.in](https://motorcart.in)

## What is ready in this repo

- Production EAS profile → API `https://motorcart.in`, demos **off**, **AAB** output
- 1024×1024 icons + adaptive assets + splash
- Play listing pack in `store/` (512 icon + 1024×500 feature graphic + copy)
- Privacy / Terms links on Login + Profile → `motorcart.in`
- Minimal Android permissions (`INTERNET`, `ACCESS_NETWORK_STATE`)
- HTTPS cleartext disabled automatically for production builds (`app.config.js`)

## What only you do (outside code)

1. Buy / open **Google Play Console** → create app `in.motorcart.app`
2. Paste listing from `store/LISTING.md` + upload `store/*` graphics + 2+ screenshots
3. Set privacy URL: `https://motorcart.in/privacy`
4. On this machine:

```powershell
npm install -g eas-cli
cd apps/mobile-customer
npx eas login
npx eas init
npx eas build -p android --profile production
```

5. Download **AAB** → Play Console → **Internal testing** → QA → Production

---

## Real login (no demo accounts)

Demo role picker is **off** in production builds.

### Option A — New user
1. App → **Sign up**
2. Customer or Business signup
3. Sign in (production may require email verification)

### Option B — Existing website account
Use the same email + password as https://motorcart.in

---

## Local Expo (dev)

```powershell
cd apps/mobile-customer
copy .env.example .env
npm install
npx expo start
```

| Target | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| Web / iOS sim | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone | `http://YOUR_LAN_IP:3000` |

Docker web preview `:8090` is **not** the Play binary — use EAS AAB for store.

---

## Checklist

- [x] Privacy + terms live on motorcart.in
- [x] Store icons 1024 / 512 + feature graphic
- [x] Production EAS env + AAB profile
- [x] In-app Privacy / Terms links
- [ ] Play Console app created (`in.motorcart.app`) — **you**
- [ ] `npx eas init` → commit `projectId` — **you**
- [ ] `eas build` production AAB — **you**
- [ ] Screenshots from device/emulator — **you**
- [ ] Upload AAB + promote Internal → Production — **you**

## Related

- `store/LISTING.md` — Console paste pack
- `cursor/19_Mobile_Applications.md`

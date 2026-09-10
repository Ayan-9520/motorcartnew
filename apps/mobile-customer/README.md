# Motorcart Customer App (Expo) — production-ready companion

Package: `in.motorcart.app` · Same JWT API as [motorcart.in](https://motorcart.in)

## Real login (no demo accounts)

Demo role picker is **removed**. Use a real account:

### Option A — New user (recommended)
1. Open app → **Sign up**
2. Enter full name, email, password (customer)
3. Or choose **Business** for dealer-style signup (may need admin approval)
4. Sign in with the same email + password

**Local Docker:** `.env.docker` has `MAILER_AUTOCONFIRM=true` so new accounts can sign in without email link.  
**Production (`motorcart.in`):** email verification may be required (`MAILER_AUTOCONFIRM=false`) — check inbox, then sign in.

### Option B — Existing website account
1. Use the **same email + password** you use on https://motorcart.in
2. App → **Sign in** → enter email & password → Sign in

### Local Docker test
1. Stack up: `docker compose --env-file .env.docker up -d`
2. Mobile preview: `docker compose --env-file .env.docker --profile mobile up -d --build mobile-app`
3. Open http://127.0.0.1:8090 → Sign up with **your** email (e.g. `you@gmail.com`) or sign in with an account already in the local DB

Password reset: use the website login flow (link on the sign-in screen).

---

## Local Expo (phone / emulator)

```powershell
cd apps/mobile-customer
copy .env.example .env
# Set EXPO_PUBLIC_API_URL to your PC LAN IP :3000 for a physical phone
npm install
npx expo start
```

| Target | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| Web / iOS sim | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone | `http://YOUR_LAN_IP:3000` |

---

## Play Store (production)

```powershell
npm install -g eas-cli
cd apps/mobile-customer
npx eas login
npx eas init
npx eas build -p android --profile production
npx eas submit -p android --profile production --latest
```

Production profile already sets:
- API → `https://motorcart.in`
- Demo logins → **off**
- AAB + auto version bump
- Cleartext HTTP off when API is HTTPS (`app.config.js`)

Service account JSON: `google-play-service-account.json` (gitignored).

---

## Checklist before store release

- [ ] Privacy policy + terms live on motorcart.in
- [ ] Play Console app created (`in.motorcart.app`)
- [ ] EAS `projectId` via `eas init`
- [ ] Internal track QA with real accounts
- [ ] Screenshots + feature graphic

## Related

- `cursor/19_Mobile_Applications.md`

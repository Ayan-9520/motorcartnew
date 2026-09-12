# Play Store listing pack — Motorcart (`in.motorcart.app`)

Use these files in Google Play Console. Code + assets are production-ready; only Console purchase + AAB upload remain.

## Files in this folder

| File | Play Console field | Size |
|------|--------------------|------|
| `icon-512.png` | High-res icon | 512×512 |
| `icon-1024.png` | Source / adaptive | 1024×1024 |
| `feature-graphic.png` | Feature graphic | 1024×500 |

Phone screenshots: capture from emulator / device after `eas build` preview APK (min 2).

## Store listing copy (paste)

**App name:** Motorcart

**Short description (80 chars max):**  
India's AI-powered automotive OS — CRM companion for buyers & dealers.

**Full description:**
```
Motorcart is India's AI-powered Automotive Operating System companion.

Sign in with the same Motorcart.in account to:
• Check showroom KPIs and live stock glance
• Manage leads and workspace desks on the go
• Open the full web CRM when you need inventory editing & bulk tools

Secure JWT login. Privacy policy: https://motorcart.in/privacy
Terms: https://motorcart.in/terms
Support: use contact details on motorcart.in
```

**Category:** Business (or Auto & Vehicles)  
**Privacy policy URL:** https://motorcart.in/privacy  
**App package:** `in.motorcart.app`

## Build & upload (your laptop)

```powershell
npm install -g eas-cli
cd apps/mobile-customer
npx eas login
npx eas init
# writes expo.extra.eas.projectId into app.json — commit that one line
npx eas build -p android --profile production
# Download AAB from Expo dashboard → Upload in Play Console (Internal testing first)
```

Optional auto-submit (after Play Console + service account):
1. Create Google Cloud service account with Play Developer API access
2. Save JSON as `apps/mobile-customer/google-play-service-account.json` (gitignored)
3. `npx eas submit -p android --profile production --latest`

## Data safety (Console)

- Collected: email, name, phone (account) — app functionality
- Not sold
- Encrypted in transit (HTTPS → motorcart.in)
- Account deletion: via motorcart.in support / account flows

## After first EAS build — App Links

1. From Expo / Play App Signing, copy SHA-256 certificate fingerprint  
2. Replace `REPLACE_WITH_EAS_OR_PLAY_APP_SIGNING_SHA256` in  
   `frontend/public/.well-known/assetlinks.json`  
3. Redeploy frontend so `https://motorcart.in/.well-known/assetlinks.json` is live

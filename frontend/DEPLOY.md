# Frontend — build `dist` & upload

## 1. Production env

```bash
cd frontend
copy .env.production.example .env.production
```

Edit `.env.production` — **required**:

```env
VITE_API_URL=https://YOUR-API-DOMAIN.com
VITE_SOCKET_URL=https://YOUR-API-DOMAIN.com
VITE_SITE_URL=https://YOUR-FRONTEND-DOMAIN.com
```

Use your real backend URL (where Next/API runs). Without this, login and enquiries will fail after upload.

## 2. Build

```powershell
cd frontend
npm install
npm run build
```

Output folder: **`frontend/dist/`** — upload this entire folder to hosting.

Quick check locally:

```bash
npm run preview:dist
```

Open http://localhost:4173

## 3. Upload (cPanel / shared hosting)

1. Zip contents of `dist/` (not the `dist` folder name itself — put `index.html` at public_html root).
2. Upload to `public_html` or subdomain folder.
3. Ensure `.htaccess` from `public/` is in the upload (copied into `dist` automatically) for React routes.

## 4. Subfolder deploy

If the site is `https://domain.com/app/`:

```env
VITE_BASE_PATH=/app/
```

Rebuild, then upload `dist` into the `app` folder.

## 5. Backend CORS

On the server, backend `.env` must allow your frontend:

```env
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page after upload | Check `VITE_BASE_PATH` matches folder; check browser console 404 on assets |
| API errors | Set `VITE_API_URL` before build; rebuild |
| 404 on `/login` refresh | Add `.htaccess` SPA rewrite (included in `public/`) |
| Build fails TypeScript | Run `npm run build` and fix listed errors |

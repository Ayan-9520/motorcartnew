# Auth email + OTP (Hostinger SMTP)

## What works

| Flow | Channel | Expiry |
|------|---------|--------|
| Signup verification | Email (code + link to `/verify-email`) | 48 hours |
| Email OTP login | Email | 10 minutes |
| Password login | Requires verified email when `MAILER_AUTOCONFIRM=false` | — |
| Phone OTP login | SMS (MSG91 when `SMS_API_KEY` set) | 10 minutes |
| Forgot password | Email reset link | 1 hour |

## Local Docker (test first)

1. Create Hostinger mailbox (e.g. `noreply@motorcart.in`) → copy SMTP password.
2. Put values in repo-root `.env.docker` (and keep `.env.production` for VPS later):

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@motorcart.in
SMTP_PASS=your_mailbox_password
MAIL_FROM="MotorCart <noreply@motorcart.in>"
MAILER_AUTOCONFIRM=false
FRONTEND_URL=http://127.0.0.1:3000
```

3. Rebuild backend:

```powershell
docker compose --env-file .env.docker up -d --build backend
```

4. Signup with your real email → check inbox → open link or `/verify-email` → login.
5. Login page → **Email OTP** tab → code arrives on same email.
6. Phone OTP needs `SMS_API_KEY`; without it, code is logged in `docker logs motorcart-backend-1` (non-production).

## VPS (after local works)

```bash
cd /opt/motorcart
git pull
# edit .env.production + copy to .env.docker — same SMTP_* as local
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend frontend
```

Do **not** push untested mail code straight to VPS.

## Hostinger SMTP notes

- Host: `smtp.hostinger.com`
- Port: `465` (SSL) or `587` (STARTTLS — set `SMTP_SECURE=false`)
- Use a real mailbox password from Hostinger → Emails

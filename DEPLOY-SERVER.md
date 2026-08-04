# Motorcart — Server Deploy Guide (Production)

Yeh guide tab use karo jab aap **VPS/server purchase** kar chuke ho (DigitalOcean, AWS, Hostinger, etc.) aur sirf **data dalna + domain point karna** baaki ho.

## Server requirements

| Item | Minimum |
|------|---------|
| OS | Ubuntu 22.04+ / Debian 12+ |
| RAM | 4 GB (8 GB recommended) |
| CPU | 2 vCPU |
| Disk | 40 GB SSD |
| Software | Docker 24+ & Docker Compose v2 |

## 1. Server par code lao

```bash
git clone https://github.com/YOUR_ORG/motorcartcursor.git
cd motorcartcursor
```

## 2. Production env banao

```bash
cp .env.production.example .env.production
nano .env.production   # sab CHANGE_ME values bhari karo
```

**Zaroori fields:**
- `POSTGRES_PASSWORD` — strong random password
- `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — 32+ chars each
- `CORS_ORIGIN`, `FRONTEND_URL`, `VITE_SITE_URL` — `https://yourdomain.com`
- `SMTP_*` — email verification ke liye

## 3. One-command deploy

**Linux:**
```bash
chmod +x scripts/deploy-server.sh scripts/verify-stack.sh
./scripts/deploy-server.sh .env.production
```

**Windows (prod test):**
```powershell
.\scripts\deploy-server.ps1 -EnvFile .env.production
```

Yeh automatically karega:
- Docker images build
- PostgreSQL + Redis start
- `prisma migrate deploy` + seed (demo users + vehicles + community)
- Nginx reverse proxy (same-origin `/api`)

## 4. DNS point karo

Domain registrar par **A record** → server IP  
Example: `yourdomain.com` → `203.0.113.50`

## 5. SSL (HTTPS) — Let's Encrypt

```bash
sudo apt install certbot
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com
```

Phir `infra/nginx/nginx.prod.conf` mein HTTPS server block uncomment karo aur compose mein mount:
```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate nginx
```

## 6. Verify

```bash
./scripts/verify-stack.sh https://yourdomain.com
```

Expected: `/api/health` → `{"status":"ok",...}`

## 7. Default logins (seed — production mein password change karo)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@motorcart.in | Admin@12345 |
| Customer | customer@motorcart.in | Customer@123 |
| Dealer | dealer@gmail.com | Dealer@123 |

## 8. Sirf data add karna baaki

Deploy ke baad yeh server-side ready hai:
- Marketplace vehicles (admin/dealer dashboards)
- Leads / CRM
- Community posts & groups
- Finance, auctions, parts modules

**Data add karne ke liye:**
1. Admin login → Platform Admin dashboard
2. Dealer login → inventory / leads
3. Ya direct Postgres / API seed scripts

## 9. Optional: Mobile web preview

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml --profile mobile up -d mobile-app
```
→ `http://SERVER_IP:8090`

## 10. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Mat kholo publicly:** 5432 (Postgres), 6379 (Redis) — prod compose inhe localhost par bind karta hai.

## Dev vs Prod

| | Dev | Prod |
|---|-----|------|
| Env file | `.env.docker` | `.env.production` |
| Compose | `docker-compose.yml` | `+ docker-compose.prod.yml` |
| Command | `npm run docker:up` | `npm run docker:prod:up` |
| NODE_ENV | development | production |

## Troubleshooting

```bash
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production ps
curl http://127.0.0.1/api/health
```

Rebuild after code changes:
```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

#!/usr/bin/env bash
# Ensures /opt/motorcart/.env.production has domain, ports, and Hostinger SMTP keys.
# Does NOT overwrite existing secrets. Run on the VPS after: git pull origin main
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
EXAMPLE="${ROOT}/.env.production.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$EXAMPLE" ]]; then
    cp "$EXAMPLE" "$ENV_FILE"
    echo "Created $ENV_FILE from example"
  else
    echo "Missing $EXAMPLE" >&2
    exit 1
  fi
fi

set_kv() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # Only replace empty / CHANGE_ME / yourdomain placeholders
    if grep -qE "^${key}=(CHANGE_ME.*|https://yourdomain\.com.*|)$" "$ENV_FILE" \
      || grep -qE "^${key}=https://yourdomain.com" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

# Force live MotorCart host settings (safe to re-run)
force_kv() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

force_kv "CORS_ORIGIN" "https://motorcart.in,https://www.motorcart.in"
force_kv "FRONTEND_URL" "https://motorcart.in"
force_kv "VITE_SITE_URL" "https://motorcart.in"
force_kv "NGINX_HTTP_PORT" "3080"
force_kv "NGINX_PORT" "3080"
force_kv "RUN_DB_SEED" "false"
force_kv "VITE_ADMIN_DEMO_FALLBACK" "false"
force_kv "VITE_REAL_DATA_ONLY" "true"
force_kv "MAILER_AUTOCONFIRM" "false"
force_kv "SMTP_HOST" "smtp.hostinger.com"
force_kv "SMTP_PORT" "465"
force_kv "SMTP_SECURE" "true"
force_kv "SMTP_USER" "info@motorcart.in"
force_kv "MAIL_FROM" "MotorCart <info@motorcart.in>"

if ! grep -qE "^SMTP_PASS=" "$ENV_FILE"; then
  echo "SMTP_PASS=" >> "$ENV_FILE"
fi

# Generate JWT secrets only when still placeholders
rand_secret() {
  openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | xxd -p | head -c 48
}

for key in JWT_SECRET JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  if grep -qE "^${key}=CHANGE_ME" "$ENV_FILE" || ! grep -qE "^${key}=" "$ENV_FILE"; then
    force_kv "$key" "$(rand_secret)"
  fi
done

echo "Updated: $ENV_FILE"
echo "---- SMTP / mail lines ----"
grep -E '^(MAILER_AUTOCONFIRM|SMTP_|MAIL_FROM|FRONTEND_URL|NGINX_|CORS_ORIGIN)=' "$ENV_FILE" || true
echo "---------------------------"
if grep -qE '^SMTP_PASS=(CHANGE_ME)?$' "$ENV_FILE"; then
  echo "ACTION REQUIRED: set SMTP_PASS in $ENV_FILE (Hostinger mailbox password), then rebuild."
  echo "Example:"
  echo "  nano $ENV_FILE"
  echo "  # set SMTP_PASS=your_password"
  echo "  docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend frontend nginx"
  exit 2
fi

echo "SMTP_PASS is set. Ready to rebuild containers."

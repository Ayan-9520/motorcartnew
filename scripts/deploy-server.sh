#!/usr/bin/env bash
# Motorcart — production server deploy (Linux VPS)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
COMPOSE="docker compose --env-file ${ENV_FILE} -f docker-compose.yml -f docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example and edit secrets + domain."
  exit 1
fi

echo "==> Building and starting stack..."
$COMPOSE up -d --build

echo "==> Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${NGINX_HTTP_PORT:-80}/api/health" >/dev/null 2>&1 \
    || curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
    echo "Backend healthy."
    break
  fi
  sleep 5
done

echo ""
echo "Deploy complete."
echo "  Health: curl http://YOUR_DOMAIN/api/health"
echo "  Admin:  admin@motorcart.in / Admin@12345 (change after first login)"
echo ""
echo "Next: point DNS A record to this server, then run SSL (see DEPLOY-SERVER.md)."

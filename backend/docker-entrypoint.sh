#!/bin/sh
set -eu

DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${POSTGRES_USER:-motorcart}"

echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}…"
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  sleep 2
done

echo "[entrypoint] Applying schema…"
if [ -d "prisma/migrations" ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
  if ! npx prisma migrate deploy; then
    echo "[entrypoint] migrate deploy failed — resolving and falling back to db push…"
    npx prisma migrate resolve --rolled-back 20250704120000_init 2>/dev/null || true
    npx prisma db push --skip-generate --accept-data-loss
  fi
else
  npx prisma db push --skip-generate
fi

echo "[entrypoint] Seeding…"
npm run db:seed || true

exec "$@"

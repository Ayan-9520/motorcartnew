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
    echo "[entrypoint] ERROR: prisma migrate deploy failed."
    echo "[entrypoint] Refusing to run prisma db push (no destructive fallback)."
    echo "[entrypoint] Fix migration history and re-run the container."
    exit 1
  fi
else
  echo "[entrypoint] ERROR: No Prisma migrations found."
  echo "[entrypoint] Refusing to run prisma db push (no destructive fallback)."
  exit 1
fi

echo "[entrypoint] Seeding…"
npm run db:seed || true

exec "$@"

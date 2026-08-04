#!/usr/bin/env bash
# Verify Motorcart stack after deploy
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"

check() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}" || echo "000")
  printf "%-40s %s\n" "${path}" "${code}"
}

echo "Motorcart stack check — ${BASE}"
check "/api/health"
check "/"
check "/community"
check "/api/community/feed?limit=3"
check "/buy/cars/used"

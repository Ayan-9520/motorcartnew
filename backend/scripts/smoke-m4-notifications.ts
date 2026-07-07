/**
 * Smoke — M4 unified notifications (flags OFF → 404)
 * Run: npx tsx scripts/smoke-m4-notifications.ts
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

const CHECKS: { path: string; method: string; expect: number }[] = [
  { path: "/api/notifications/overview", method: "GET", expect: 404 },
  { path: "/api/notifications/list", method: "GET", expect: 404 },
  { path: "/api/notifications/read-all", method: "PATCH", expect: 404 },
  { path: "/api/notifications/community%3Atest/read", method: "PATCH", expect: 404 },
  { path: "/api/health", method: "GET", expect: 200 },
];

async function main() {
  console.log(`Smoke base: ${BASE}\n`);
  let pass = true;
  for (const { path, method, expect } of CHECKS) {
    const res = await fetch(`${BASE}${path}`, { method });
    const ok = res.status === expect;
    console.log(`${ok ? "✓" : "✗"} ${method} ${path} → ${res.status} (expected ${expect})`);
    if (!ok) pass = false;
  }
  const legacy = await fetch(`${BASE}/api/notifications`, { method: "GET" });
  const legacyOk = legacy.status === 401 || legacy.status === 404;
  console.log(
    `${legacyOk ? "✓" : "✗"} GET /api/notifications (legacy) → ${legacy.status} (unchanged: 401 without token)`
  );
  if (!legacyOk) pass = false;
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

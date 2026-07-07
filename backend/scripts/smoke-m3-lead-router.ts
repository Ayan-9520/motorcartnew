/**
 * Smoke — M3.0 lead router (flags OFF → 404)
 * Run: npx tsx scripts/smoke-m3-lead-router.ts
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

const PATHS = [
  "/api/lead-router/overview",
  "/api/lead-router/history",
  "/api/lead-router/route",
];

async function check(path: string, method: string, expect: number) {
  const res = await fetch(`${BASE}${path}`, { method });
  const ok = res.status === expect;
  console.log(`${ok ? "✓" : "✗"} ${method} ${path} → ${res.status} (expected ${expect})`);
  return ok;
}

async function main() {
  console.log(`Smoke base: ${BASE}\n`);
  let pass = true;
  for (const p of PATHS) {
    if (!(await check(p, p.endsWith("/route") ? "POST" : "GET", 404))) pass = false;
  }
  const health = await check("/api/health", "GET", 200);
  if (!health) pass = false;
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

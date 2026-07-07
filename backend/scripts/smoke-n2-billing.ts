/**
 * Smoke — N2.1 billing MVP (flags OFF → 404)
 * Run: npx tsx scripts/smoke-n2-billing.ts
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

const CHECKS: { path: string; method: string; expect: number }[] = [
  { path: "/api/billing/plans", method: "GET", expect: 404 },
  { path: "/api/billing/entitlements", method: "GET", expect: 404 },
  { path: "/api/billing/subscription", method: "GET", expect: 404 },
  { path: "/api/billing/subscription", method: "POST", expect: 404 },
  { path: "/api/billing/usage", method: "GET", expect: 404 },
  { path: "/api/billing/overview", method: "GET", expect: 404 },
  { path: "/api/health", method: "GET", expect: 200 },
];

async function main() {
  console.log(`Smoke base: ${BASE}\n`);
  let pass = true;
  for (const { path, method, expect } of CHECKS) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify({ plan_slug: "starter" }) : undefined,
    });
    const ok = res.status === expect;
    console.log(`${ok ? "✓" : "✗"} ${method} ${path} → ${res.status} (expected ${expect})`);
    if (!ok) pass = false;
  }
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

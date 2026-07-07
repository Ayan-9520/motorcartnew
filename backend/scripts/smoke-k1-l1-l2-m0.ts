/**
 * Smoke test — K1, L1, L2, M0 (flags OFF → 404; health → 200)
 * Run: npx tsx scripts/smoke-k1-l1-l2-m0.ts
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

const PATHS_OFF = [
  "/api/directory/monetization/config",
  "/api/directory/featured/dealers",
  "/api/directory/sponsored",
  "/api/directory/premium",
  "/api/directory/verified",
  "/api/growth/whatsapp/providers/config",
  "/api/growth/social/config",
  "/api/founder/overview",
];

async function check(path: string, expect: number) {
  const res = await fetch(`${BASE}${path}`);
  const ok = res.status === expect;
  console.log(`${ok ? "✓" : "✗"} ${path} → ${res.status} (expected ${expect})`);
  return ok;
}

async function main() {
  console.log(`Smoke base: ${BASE}\n`);
  let pass = true;
  for (const p of PATHS_OFF) {
    const ok = await check(p, 404);
    if (!ok) pass = false;
  }
  const health = await check("/api/health", 200);
  if (!health) pass = false;
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

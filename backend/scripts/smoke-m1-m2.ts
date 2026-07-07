/**
 * Smoke — M1.0 + M2.0 (flags OFF → 404)
 * Run: npx tsx scripts/smoke-m1-m2.ts
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

const PATHS: { path: string; expect: number }[] = [
  { path: "/api/ecosystem/context", expect: 404 },
  { path: "/api/business-hub/demo-dealer", expect: 404 },
  { path: "/api/health", expect: 200 },
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
  for (const { path, expect } of PATHS) {
    if (!(await check(path, expect))) pass = false;
  }
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

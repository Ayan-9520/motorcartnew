/**
 * Smoke — M5 unified search (flags OFF → 404)
 */
const BASE = process.env.SMOKE_API_URL ?? "http://localhost:3001";

async function check(path: string, expect: number) {
  const res = await fetch(`${BASE}${path}`);
  const ok = res.status === expect;
  console.log(`${ok ? "✓" : "✗"} GET ${path} → ${res.status} (expected ${expect})`);
  return ok;
}

async function main() {
  console.log(`Smoke base: ${BASE}\n`);
  let pass = true;
  for (const p of ["/api/search", "/api/search/suggestions?q=ma", "/api/search/categories", "/api/health"]) {
    const expect = p === "/api/health" ? 200 : 404;
    if (!(await check(p, expect))) pass = false;
  }
  console.log(pass ? "\nAll smoke checks passed." : "\nSome checks failed.");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Dev: verify user email via backend API
 * Usage: npm run auth:confirm -- user@email.com
 *
 * Or from backend: npx tsx scripts/confirm-email.ts user@email.com
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run auth:confirm -- user@email.com");
  process.exit(1);
}

const backendScript = resolve(process.cwd(), "../backend/scripts/confirm-email.ts");
const result = spawnSync("npx", ["tsx", backendScript, email], {
  stdio: "inherit",
  shell: true,
  cwd: resolve(process.cwd(), "../backend"),
});

process.exit(result.status ?? 1);

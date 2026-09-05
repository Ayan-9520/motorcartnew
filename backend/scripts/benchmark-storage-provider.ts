/**
 * Benchmark storage provider layer (mock in-memory).
 * Run: npm run benchmark:storage-provider
 */
import { CloudflareR2Provider, LocalProvider, S3Provider } from "../src/lib/storage/providers";

const body = Buffer.alloc(8192, 1);

async function runCase(name: string, provider: LocalProvider | CloudflareR2Provider | S3Provider, count: number) {
  const start = process.hrtime.bigint();

  for (let i = 0; i < count; i++) {
    const key = `catalog/images/item-${i}.jpg`;
    const upload = await provider.upload({ key, body, contentType: "image/jpeg" });
    if (!upload.success) throw new Error(upload.error.message);
    await provider.exists(key);
    await provider.getSignedUrl(key, { expiresInSeconds: 300 });
  }

  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  console.log(name);
  console.log(`  operations : ${count * 3} (upload + exists + signedUrl)`);
  console.log(`  objects    : ${count}`);
  console.log(`  time       : ${ms.toFixed(2)} ms`);
  console.log(`  ops/sec    : ${Math.round((count * 3) / (ms / 1000)).toLocaleString()}`);
  console.log("");
}

async function main() {
  console.log("=== Storage Provider Layer Benchmark (mock) ===\n");

  await runCase(
    "LocalProvider (1k objects)",
    new LocalProvider({ bucket: "dev-catalog", localRootPath: "/tmp/motorcart" }),
    1_000,
  );

  await runCase(
    "CloudflareR2Provider (1k objects)",
    new CloudflareR2Provider({ bucket: "motorcart", accountId: "bench-account" }),
    1_000,
  );

  await runCase(
    "S3Provider (1k objects)",
    new S3Provider({ bucket: "motorcart-prod", region: "ap-south-1" }),
    1_000,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Benchmark catalog import media pipeline (in-memory mock downloads).
 * Run: npm run benchmark:catalog-import-media
 */
import { extractMediaFromStandardRecords } from "../src/lib/catalog/import/media/catalog-media-input";
import { createMockMediaDownloader } from "../src/lib/catalog/import/media/media-downloader";
import { runMediaPipeline } from "../src/lib/catalog/import/media/media-pipeline.engine";
import {
  buildPngBuffer,
  buildStandardFixtures,
  okDownload,
} from "../src/lib/catalog/import/media/media-test-fixtures";
import type { StandardCatalogImportRecord } from "../src/lib/catalog/import/parser/parser-types";

function buildRecords(count: number): StandardCatalogImportRecord[] {
  const records: StandardCatalogImportRecord[] = [];
  for (let i = 0; i < count; i++) {
    records.push({
      rowNumber: i + 2,
      brand: "hyundai",
      model: "creta",
      variant: "sx",
      fuel: "diesel",
      transmission: "at",
      year: 2025,
      bodyType: null,
      color: null,
      exShowroomPrice: null,
      onRoadPrice: null,
      city: null,
      state: null,
      imageUrl: `https://cdn.example/img-${i % 20}.png`,
      brochureUrl: i % 10 === 0 ? `https://cdn.example/bro-${i}.pdf` : null,
      description: null,
      features: [],
    });
  }
  return records;
}

function buildLargeFixtures(recordCount: number): Record<string, ReturnType<typeof okDownload>> {
  const fixtures = { ...buildStandardFixtures() };
  const png = buildPngBuffer(200, 200);
  const pdf = fixtures["https://cdn.example/brochure.pdf"]!;

  for (let i = 0; i < recordCount; i++) {
    fixtures[`https://cdn.example/img-${i % 20}.png`] = okDownload(Buffer.from(png), "image/png");
    if (i % 10 === 0) {
      fixtures[`https://cdn.example/bro-${i}.pdf`] = pdf;
    }
  }
  return fixtures;
}

async function main() {
  const sampleRecords = buildRecords(3);
  const largeRecords = buildRecords(500);

  const cases = [
    {
      name: "sample (3 rows, mock CDN)",
      inputs: extractMediaFromStandardRecords(sampleRecords),
      fixtures: buildLargeFixtures(3),
    },
    {
      name: "500 rows (~550 media items)",
      inputs: extractMediaFromStandardRecords(largeRecords),
      fixtures: buildLargeFixtures(500),
    },
  ];

  console.log("=== Catalog Import Media Pipeline Benchmark ===\n");

  for (const c of cases) {
    const downloader = createMockMediaDownloader(c.fixtures);
    await runMediaPipeline(c.inputs, downloader);
    const start = process.hrtime.bigint();
    const report = await runMediaPipeline(c.inputs, downloader);
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(c.name);
    console.log(`  media items         : ${c.inputs.length}`);
    console.log(`  valid images        : ${report.summary.validImageCount}`);
    console.log(`  duplicate images    : ${report.summary.duplicateImageCount}`);
    console.log(`  invalid images      : ${report.summary.invalidImageCount}`);
    console.log(`  broken urls         : ${report.summary.brokenUrlCount}`);
    console.log(`  unsupported formats : ${report.summary.unsupportedFormatCount}`);
    console.log(`  time                : ${ms.toFixed(2)} ms`);
    console.log(`  items/sec           : ${Math.round(c.inputs.length / (ms / 1000)).toLocaleString()}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

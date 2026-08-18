import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMediaFromImportRecord,
  extractMediaFromStandardRecord,
} from "./catalog-media-input";
import { runCatalogMediaPipeline } from "./catalog-media-processor";
import { createMockMediaDownloader } from "./media-downloader";
import { detectFileFormat } from "./media-file-type";
import { readImageDimensions, validateImageDimensions } from "./media-image-dimensions";
import { runMediaPipeline } from "./media-pipeline.engine";
import { buildMediaReportBundle, mediaItemsToCsv } from "./media-report";
import {
  buildMp4Buffer,
  buildPdfBuffer,
  buildPngBuffer,
  buildStandardFixtures,
  FIXTURE_URLS,
} from "./media-test-fixtures";
import { parseMultiValueUrls, validateMediaUrl } from "./media-url-validator";
import { ImportContext } from "../import-context";
import type { MediaInputItem } from "./media-types";

describe("media URL validation", () => {
  it("accepts http(s) URLs", () => {
    const result = validateMediaUrl("https://example.com/a.jpg");
    assert.equal(result.valid, true);
  });

  it("rejects invalid URLs", () => {
    const result = validateMediaUrl("not-a-url");
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.errorCode, "URL_INVALID");
  });

  it("parses pipe-separated image lists", () => {
    const urls = parseMultiValueUrls("https://a.com/1.jpg|https://a.com/2.jpg");
    assert.deepEqual(urls, ["https://a.com/1.jpg", "https://a.com/2.jpg"]);
  });
});

describe("media file type and dimensions", () => {
  it("detects png, pdf, and mp4 formats", () => {
    assert.equal(detectFileFormat(buildPngBuffer(200, 200)), "png");
    assert.equal(detectFileFormat(buildPdfBuffer()), "pdf");
    assert.equal(detectFileFormat(buildMp4Buffer()), "mp4");
  });

  it("reads png dimensions", () => {
    const dims = readImageDimensions(buildPngBuffer(640, 480), "png");
    assert.deepEqual(dims, { width: 640, height: 480 });
  });

  it("validates dimension limits", () => {
    const tooSmall = validateImageDimensions({ width: 50, height: 50 }, {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 10000,
      maxHeight: 10000,
    });
    assert.equal(tooSmall.valid, false);
    if (!tooSmall.valid) assert.equal(tooSmall.errorCode, "IMAGE_TOO_SMALL");
  });
});

describe("catalog media input extraction", () => {
  it("extracts primary and multiple image URLs", () => {
    const items = extractMediaFromImportRecord({
      rowNumber: 2,
      segment: "car",
      fields: {
        imageUrl: "https://example.com/main.jpg",
        images: "https://example.com/a.jpg|https://example.com/b.jpg",
        brochureUrl: "https://example.com/brochure.pdf",
        videoUrl: "https://example.com/promo.mp4",
      },
    });
    assert.equal(items.filter((i) => i.kind === "image").length, 3);
    assert.ok(items.some((i) => i.field === "brochureUrl"));
    assert.ok(items.some((i) => i.field === "videoUrl"));
  });

  it("deduplicates identical URLs on same row", () => {
    const items = extractMediaFromStandardRecord({
      rowNumber: 3,
      segment: "car",
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
      imageUrl: "https://example.com/x.jpg",
      imageUrls: ["https://example.com/x.jpg"],
      brochureUrl: null,
      description: null,
      features: [],
      videoUrl: null,
    });
    assert.equal(items.length, 1);
  });
});

describe("runMediaPipeline", () => {
  const downloader = createMockMediaDownloader(buildStandardFixtures());

  it("classifies valid images", async () => {
    const inputs: MediaInputItem[] = [
      { rowNumber: 2, field: "imageUrl", kind: "image", url: FIXTURE_URLS.validImage200 },
    ];
    const report = await runMediaPipeline(inputs, downloader, { minImageWidth: 100, minImageHeight: 100 });
    assert.equal(report.validImages.length, 1);
    assert.equal(report.validImages[0]?.metadata?.width, 200);
    assert.ok(report.validImages[0]?.metadata?.sha256);
  });

  it("classifies invalid images (dimensions too small)", async () => {
    const report = await runMediaPipeline(
      [{ rowNumber: 3, field: "imageUrl", kind: "image", url: FIXTURE_URLS.smallImage }],
      downloader,
    );
    assert.equal(report.invalidImages.length, 1);
    assert.equal(report.invalidImages[0]?.errorCode, "IMAGE_TOO_SMALL");
  });

  it("classifies broken URLs", async () => {
    const report = await runMediaPipeline(
      [{ rowNumber: 4, field: "imageUrl", kind: "image", url: FIXTURE_URLS.broken }],
      downloader,
    );
    assert.equal(report.brokenUrls.length, 1);
  });

  it("classifies unsupported formats for images", async () => {
    const report = await runMediaPipeline(
      [{ rowNumber: 5, field: "imageUrl", kind: "image", url: FIXTURE_URLS.pdfAsImage }],
      downloader,
    );
    assert.equal(report.unsupportedFormats.length, 1);
  });

  it("detects duplicate images by hash", async () => {
    const report = await runMediaPipeline(
      [
        { rowNumber: 6, field: "imageUrl", kind: "image", url: FIXTURE_URLS.validImage200 },
        { rowNumber: 7, field: "imageUrls", kind: "image", url: FIXTURE_URLS.validImage200Dup },
      ],
      downloader,
    );
    assert.equal(report.duplicateImages.length, 1);
    assert.equal(report.validImages.length, 1);
    assert.equal(report.duplicateImages[0]?.duplicateOf?.rowNumber, 6);
  });

  it("processes brochure and video URLs", async () => {
    const report = await runMediaPipeline(
      [
        { rowNumber: 8, field: "brochureUrl", kind: "brochure", url: FIXTURE_URLS.brochure },
        { rowNumber: 8, field: "videoUrl", kind: "video", url: FIXTURE_URLS.video },
      ],
      downloader,
    );
    assert.equal(report.validBrochures.length, 1);
    assert.equal(report.validVideos.length, 1);
  });

  it("marks invalid URL before download as broken", async () => {
    const report = await runMediaPipeline(
      [{ rowNumber: 9, field: "imageUrl", kind: "image", url: "ftp://bad" }],
      downloader,
    );
    assert.equal(report.brokenUrls.length, 1);
    assert.equal(report.brokenUrls[0]?.errorCode, "URL_INVALID");
  });
});

describe("media reports", () => {
  it("generates CSV and JSON bundle", async () => {
    const downloader = createMockMediaDownloader(buildStandardFixtures());
    const report = await runMediaPipeline(
      [{ rowNumber: 2, field: "imageUrl", kind: "image", url: FIXTURE_URLS.validImage200 }],
      downloader,
    );
    const bundle = buildMediaReportBundle(report);
    assert.ok(bundle.itemsCsv.includes("valid_image"));
    assert.ok(bundle.summaryCsv.includes("validImageCount"));
    assert.ok(bundle.json.includes("validImages"));
    assert.ok(mediaItemsToCsv(report).split("\n").length >= 2);
  });
});

describe("runCatalogMediaPipeline", () => {
  it("stores report on import context metadata", async () => {
    const ctx = ImportContext.create({ sourceType: "csv" });
    ctx.setRecords([
      {
        rowNumber: 2,
        segment: "car",
        fields: {
          imageUrl: FIXTURE_URLS.validImage200,
          brochureUrl: FIXTURE_URLS.brochure,
        },
      },
    ]);

    const report = await runCatalogMediaPipeline(ctx, {
      downloader: createMockMediaDownloader(buildStandardFixtures()),
    });

    assert.equal(report.validImages.length, 1);
    assert.ok(ctx.metadata.catalogMediaReport);
  });
});

describe("no storage side effects", () => {
  it("processes entirely in memory", async () => {
    const downloader = createMockMediaDownloader(buildStandardFixtures());
    const report = await runMediaPipeline(
      [{ rowNumber: 2, field: "imageUrl", kind: "image", url: FIXTURE_URLS.validImage200 }],
      downloader,
    );
    assert.equal(report.processed, true);
    assert.ok(!("uploadedUrl" in (report.validImages[0] ?? {})));
  });
});

/** Test fixtures for catalog media pipeline (Phase 3E). */

export {
  buildPngBuffer,
  okMediaDownload as okDownload,
} from "./mock-media-downloader";

import type { MediaDownloadResult } from "./media-types";
import { buildPngBuffer, okMediaDownload } from "./mock-media-downloader";

export function buildPdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4\n% mock brochure\n", "utf8");
}

export function buildMp4Buffer(): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt32BE(12, 0);
  buffer.write("ftyp", 4);
  buffer.write("isom", 8);
  return buffer;
}

export function buildUnknownBuffer(): Buffer {
  return Buffer.from("plain-text-not-media", "utf8");
}

export const FIXTURE_URLS = {
  validImage200: "https://cdn.example/valid-200.png",
  validImage200Dup: "https://cdn.example/valid-200-dup.png",
  smallImage: "https://cdn.example/small.png",
  broken: "https://cdn.example/missing.png",
  pdfAsImage: "https://cdn.example/not-image.png",
  brochure: "https://cdn.example/brochure.pdf",
  video: "https://cdn.example/promo.mp4",
  unknown: "https://cdn.example/unknown.bin",
} as const;

export function buildStandardFixtures(): Record<string, MediaDownloadResult> {
  const image200 = buildPngBuffer(200, 200);
  return {
    [FIXTURE_URLS.validImage200]: okMediaDownload(image200, "image/png"),
    [FIXTURE_URLS.validImage200Dup]: okMediaDownload(Buffer.from(image200), "image/png"),
    [FIXTURE_URLS.smallImage]: okMediaDownload(buildPngBuffer(50, 50), "image/png"),
    [FIXTURE_URLS.broken]: { ok: false, errorCode: "HTTP_ERROR", errorMessage: "HTTP 404", statusCode: 404 },
    [FIXTURE_URLS.pdfAsImage]: okMediaDownload(buildPdfBuffer(), "application/pdf"),
    [FIXTURE_URLS.brochure]: okMediaDownload(buildPdfBuffer(), "application/pdf"),
    [FIXTURE_URLS.video]: okMediaDownload(buildMp4Buffer(), "video/mp4"),
    [FIXTURE_URLS.unknown]: okMediaDownload(buildUnknownBuffer(), "application/octet-stream"),
  };
}

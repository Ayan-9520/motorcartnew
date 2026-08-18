import type { MediaDownloadResult, MediaDownloader, MediaInputItem } from "./media-types";
import { createMockMediaDownloader } from "./media-downloader";

export function buildPngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(32);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

export function okMediaDownload(buffer: Buffer, contentType: string | null = null): MediaDownloadResult {
  return { ok: true, buffer, contentType, statusCode: 200 };
}

/** Dry-run downloader for pipeline use (no HTTP). */
export function createDryRunMediaDownloader(items: MediaInputItem[]): MediaDownloader {
  const png = buildPngBuffer(200, 200);
  const pdf = okMediaDownload(Buffer.from("%PDF-1.4\n"), "application/pdf");
  const mp4 = okMediaDownload(Buffer.alloc(16), "video/mp4");
  const fixtures: Record<string, MediaDownloadResult> = {};

  for (const item of items) {
    if (fixtures[item.url]) continue;
    if (item.kind === "image") fixtures[item.url] = okMediaDownload(Buffer.from(png), "image/png");
    else if (item.kind === "brochure") fixtures[item.url] = pdf;
    else if (item.kind === "video") fixtures[item.url] = mp4;
  }

  return createMockMediaDownloader(fixtures);
}

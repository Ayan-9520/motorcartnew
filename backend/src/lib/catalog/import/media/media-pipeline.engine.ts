import { detectFileFormat, isAllowedFormat } from "./media-file-type";
import { sha256Buffer } from "./media-hash";
import { readImageDimensions, validateImageDimensions } from "./media-image-dimensions";
import { validateMediaUrl } from "./media-url-validator";
import {
  DEFAULT_MEDIA_CONFIG,
  type MediaCategory,
  type MediaDownloader,
  type MediaInputItem,
  type MediaItemResult,
  type MediaMetadata,
  type MediaPipelineConfig,
  type MediaPipelineReport,
} from "./media-types";

function bucketForCategory(
  category: MediaCategory,
  item: MediaItemResult,
  report: Omit<MediaPipelineReport, "summary">,
): void {
  report.items.push(item);
  switch (category) {
    case "valid_image":
      report.validImages.push(item);
      break;
    case "invalid_image":
      report.invalidImages.push(item);
      break;
    case "duplicate_image":
      report.duplicateImages.push(item);
      break;
    case "broken_url":
      report.brokenUrls.push(item);
      break;
    case "unsupported_format":
      report.unsupportedFormats.push(item);
      break;
    case "valid_brochure":
      report.validBrochures.push(item);
      break;
    case "valid_video":
      report.validVideos.push(item);
      break;
    default:
      break;
  }
}

function buildMetadata(buffer: Buffer, contentType: string | null, format: string, dims: { width: number | null; height: number | null }): MediaMetadata {
  return {
    contentType,
    detectedFormat: format,
    byteLength: buffer.byteLength,
    width: dims.width,
    height: dims.height,
    sha256: sha256Buffer(buffer),
  };
}

async function processMediaItem(
  item: MediaInputItem,
  downloader: MediaDownloader,
  config: MediaPipelineConfig,
): Promise<MediaItemResult> {
  const urlCheck = validateMediaUrl(item.url);
  if (!urlCheck.valid) {
    return {
      ...item,
      category: "broken_url",
      errorCode: urlCheck.errorCode,
      errorMessage: urlCheck.errorMessage,
    };
  }

  const download = await downloader(urlCheck.normalizedUrl, {
    timeoutMs: config.timeoutMs,
    maxBytes: config.maxDownloadBytes,
  });

  if (!download.ok) {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "broken_url",
      errorCode: download.errorCode,
      errorMessage: download.errorMessage,
    };
  }

  const format = detectFileFormat(download.buffer);
  const allowed =
    item.kind === "image"
      ? config.allowedImageFormats
      : item.kind === "brochure"
        ? config.allowedBrochureFormats
        : config.allowedVideoFormats;

  if (!isAllowedFormat(format, allowed)) {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "unsupported_format",
      errorCode: "FORMAT_UNSUPPORTED",
      errorMessage: `Detected format "${format}" is not allowed for ${item.kind}`,
      metadata: buildMetadata(download.buffer, download.contentType, format, { width: null, height: null }),
    };
  }

  if (item.kind === "brochure") {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "valid_brochure",
      metadata: buildMetadata(download.buffer, download.contentType, format, { width: null, height: null }),
    };
  }

  if (item.kind === "video") {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "valid_video",
      metadata: buildMetadata(download.buffer, download.contentType, format, { width: null, height: null }),
    };
  }

  const dims = readImageDimensions(download.buffer, format);
  if (!dims) {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "invalid_image",
      errorCode: "IMAGE_DIMENSIONS_UNREADABLE",
      errorMessage: "Could not read image dimensions",
      metadata: buildMetadata(download.buffer, download.contentType, format, { width: null, height: null }),
    };
  }

  const dimCheck = validateImageDimensions(dims, {
    minWidth: config.minImageWidth,
    minHeight: config.minImageHeight,
    maxWidth: config.maxImageWidth,
    maxHeight: config.maxImageHeight,
  });
  if (!dimCheck.valid) {
    return {
      ...item,
      url: urlCheck.normalizedUrl,
      category: "invalid_image",
      errorCode: dimCheck.errorCode,
      errorMessage: dimCheck.errorMessage,
      metadata: buildMetadata(download.buffer, download.contentType, format, dims),
    };
  }

  return {
    ...item,
    url: urlCheck.normalizedUrl,
    category: "valid_image",
    metadata: buildMetadata(download.buffer, download.contentType, format, dims),
  };
}

function applyDuplicateDetection(items: MediaItemResult[]): MediaItemResult[] {
  const hashIndex = new Map<string, MediaItemResult>();

  return items.map((item) => {
    if (item.category !== "valid_image" || !item.metadata?.sha256) {
      return item;
    }

    const first = hashIndex.get(item.metadata.sha256);
    if (!first) {
      hashIndex.set(item.metadata.sha256, item);
      return item;
    }

    return {
      ...item,
      category: "duplicate_image",
      duplicateOf: {
        rowNumber: first.rowNumber,
        field: first.field,
        url: first.url,
        sha256: item.metadata.sha256,
      },
    };
  });
}

function buildSummary(report: Omit<MediaPipelineReport, "summary">): MediaPipelineReport["summary"] {
  return {
    totalItems: report.items.length,
    validImageCount: report.validImages.length,
    invalidImageCount: report.invalidImages.length,
    duplicateImageCount: report.duplicateImages.length,
    brokenUrlCount: report.brokenUrls.length,
    unsupportedFormatCount: report.unsupportedFormats.length,
    validBrochureCount: report.validBrochures.length,
    validVideoCount: report.validVideos.length,
  };
}

function emptyReport(): Omit<MediaPipelineReport, "summary"> {
  return {
    processed: true,
    validImages: [],
    invalidImages: [],
    duplicateImages: [],
    brokenUrls: [],
    unsupportedFormats: [],
    validBrochures: [],
    validVideos: [],
    items: [],
  };
}

/** Process catalog media URLs in memory (Phase 3E — no storage or DB). */
export async function runMediaPipeline(
  inputs: MediaInputItem[],
  downloader: MediaDownloader,
  config: Partial<MediaPipelineConfig> = {},
): Promise<MediaPipelineReport> {
  const cfg = { ...DEFAULT_MEDIA_CONFIG, ...config };
  const shell = emptyReport();

  const rawResults: MediaItemResult[] = [];
  for (const input of inputs) {
    rawResults.push(await processMediaItem(input, downloader, cfg));
  }

  const withDuplicates = applyDuplicateDetection(rawResults);

  for (const item of withDuplicates) {
    bucketForCategory(item.category, item, shell);
  }

  return { ...shell, summary: buildSummary(shell) };
}

export { DEFAULT_MEDIA_CONFIG };

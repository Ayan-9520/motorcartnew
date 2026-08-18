/** Catalog import media pipeline types (Phase 3E). */

export type MediaKind = "image" | "brochure" | "video";

export type MediaCategory =
  | "valid_image"
  | "invalid_image"
  | "duplicate_image"
  | "broken_url"
  | "unsupported_format"
  | "valid_brochure"
  | "valid_video";

export type MediaInputItem = {
  rowNumber: number;
  field: string;
  kind: MediaKind;
  url: string;
};

export type MediaMetadata = {
  contentType: string | null;
  detectedFormat: string;
  byteLength: number;
  width: number | null;
  height: number | null;
  sha256: string;
};

export type MediaDuplicateRef = {
  rowNumber: number;
  field: string;
  url: string;
  sha256: string;
};

export type MediaItemResult = {
  rowNumber: number;
  field: string;
  kind: MediaKind;
  url: string;
  category: MediaCategory;
  errorCode?: string;
  errorMessage?: string;
  metadata?: MediaMetadata;
  duplicateOf?: MediaDuplicateRef;
};

export type MediaPipelineSummary = {
  totalItems: number;
  validImageCount: number;
  invalidImageCount: number;
  duplicateImageCount: number;
  brokenUrlCount: number;
  unsupportedFormatCount: number;
  validBrochureCount: number;
  validVideoCount: number;
};

export type MediaPipelineReport = {
  processed: true;
  validImages: MediaItemResult[];
  invalidImages: MediaItemResult[];
  duplicateImages: MediaItemResult[];
  brokenUrls: MediaItemResult[];
  unsupportedFormats: MediaItemResult[];
  validBrochures: MediaItemResult[];
  validVideos: MediaItemResult[];
  items: MediaItemResult[];
  summary: MediaPipelineSummary;
};

export type MediaDownloadSuccess = {
  ok: true;
  buffer: Buffer;
  contentType: string | null;
  statusCode: number;
};

export type MediaDownloadFailure = {
  ok: false;
  errorCode: string;
  errorMessage: string;
  statusCode?: number;
};

export type MediaDownloadResult = MediaDownloadSuccess | MediaDownloadFailure;

export type MediaDownloader = (url: string, options: { timeoutMs: number; maxBytes: number }) => Promise<MediaDownloadResult>;

export type MediaPipelineConfig = {
  timeoutMs: number;
  maxDownloadBytes: number;
  minImageWidth: number;
  minImageHeight: number;
  maxImageWidth: number;
  maxImageHeight: number;
  allowedImageFormats: readonly string[];
  allowedBrochureFormats: readonly string[];
  allowedVideoFormats: readonly string[];
};

export const DEFAULT_MEDIA_CONFIG: MediaPipelineConfig = {
  timeoutMs: 15_000,
  maxDownloadBytes: 10 * 1024 * 1024,
  minImageWidth: 100,
  minImageHeight: 100,
  maxImageWidth: 10_000,
  maxImageHeight: 10_000,
  allowedImageFormats: ["jpeg", "png", "gif", "webp"],
  allowedBrochureFormats: ["pdf"],
  allowedVideoFormats: ["mp4", "webm"],
};

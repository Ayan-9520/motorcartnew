import type { MediaDownloadResult, MediaDownloader } from "./media-types";

export type { MediaDownloadResult, MediaDownloader } from "./media-types";

export type FetchMediaDownloaderOptions = {
  headers?: Record<string, string>;
};

/** Default in-memory downloader using global fetch (Node 18+). */
export function createFetchMediaDownloader(options?: FetchMediaDownloaderOptions): MediaDownloader {
  return async (url, downloadOptions) =>
    downloadWithFetch(url, downloadOptions.timeoutMs, downloadOptions.maxBytes, options?.headers);
}

async function downloadWithFetch(
  url: string,
  timeoutMs: number,
  maxBytes: number,
  headers?: Record<string, string>,
): Promise<MediaDownloadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: headers ?? undefined,
    });
    const statusCode = response.status;

    if (!response.ok) {
      return {
        ok: false,
        errorCode: "HTTP_ERROR",
        errorMessage: `HTTP ${statusCode}`,
        statusCode,
      };
    }

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > maxBytes) {
      return {
        ok: false,
        errorCode: "FILE_TOO_LARGE",
        errorMessage: `Downloaded ${buffer.byteLength} bytes exceeds limit ${maxBytes}`,
        statusCode,
      };
    }

    return { ok: true, buffer, contentType, statusCode };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      errorCode: aborted ? "DOWNLOAD_TIMEOUT" : "DOWNLOAD_FAILED",
      errorMessage: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Map-based downloader for unit tests and dry-run benchmarks. */
export function createMockMediaDownloader(
  fixtures: Record<string, MediaDownloadResult | (() => MediaDownloadResult)>,
): MediaDownloader {
  return async (url) => {
    const fixture = fixtures[url];
    if (!fixture) {
      return { ok: false, errorCode: "NOT_FOUND", errorMessage: `No fixture for ${url}` };
    }
    return typeof fixture === "function" ? fixture() : fixture;
  };
}

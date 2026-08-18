import type { PageDriver, ScreenshotOptions } from "./browser-types";
import type { ScreenshotCapture } from "./worker-types";

/** Captures PNG screenshots from a page driver. */
export class ScreenshotService {
  async capture(page: PageDriver, options?: ScreenshotOptions): Promise<ScreenshotCapture> {
    const buffer = await page.screenshot({ fullPage: options?.fullPage ?? false, type: "png" });
    return {
      buffer,
      format: "png",
      byteLength: buffer.byteLength,
      capturedAt: new Date().toISOString(),
    };
  }
}

export function createScreenshotService(): ScreenshotService {
  return new ScreenshotService();
}

import type { PageDriver } from "./browser-types";
import type { HtmlSnapshot } from "./worker-types";

/** Captures HTML document snapshots from a page driver. */
export class HTMLSnapshotService {
  async capture(page: PageDriver): Promise<HtmlSnapshot> {
    const content = await page.content();
    return {
      content,
      byteLength: Buffer.byteLength(content, "utf8"),
      capturedAt: new Date().toISOString(),
    };
  }
}

export function createHtmlSnapshotService(): HTMLSnapshotService {
  return new HTMLSnapshotService();
}

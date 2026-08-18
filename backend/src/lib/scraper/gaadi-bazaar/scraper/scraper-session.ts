import type { DomNodeSnapshot, DomQueryPort } from "../pom/dom/dom-ports";
import { HtmlDomQueryPort } from "../pom/dom/html-dom-query";

/** DOM port that can reload HTML after navigation without recreating page objects. */
export class MutableDomQueryPort implements DomQueryPort {
  private inner: DomQueryPort;

  constructor(html: string) {
    this.inner = HtmlDomQueryPort.fromHtml(html);
  }

  reload(html: string): void {
    this.inner = HtmlDomQueryPort.fromHtml(html);
  }

  queryText(selector: string): string | null {
    return this.inner.queryText(selector);
  }

  queryAttr(selector: string, attribute: string): string | null {
    return this.inner.queryAttr(selector, attribute);
  }

  queryAll(selector: string): DomNodeSnapshot[] {
    return this.inner.queryAll(selector);
  }

  queryAllAttr(selector: string, attribute: string): string[] {
    return this.inner.queryAllAttr(selector, attribute);
  }

  exists(selector: string): boolean {
    return this.inner.exists(selector);
  }
}

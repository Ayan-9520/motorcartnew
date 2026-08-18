import { parse, type HTMLElement } from "node-html-parser";
import type { DomNodeSnapshot, DomQueryPort } from "./dom-ports";

function attrMap(node: HTMLElement): Record<string, string> {
  const raw = node.attributes ?? {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function nodeSnapshot(node: HTMLElement): DomNodeSnapshot {
  return {
    text: node.text.trim(),
    attributes: attrMap(node),
  };
}

function matchesElement(node: HTMLElement, selector: string): boolean {
  if (selector.startsWith("[data-gb=")) {
    const match = selector.match(/^\[data-gb="([^"]+)"\]$/);
    if (!match) return false;
    return node.getAttribute("data-gb") === match[1];
  }

  if (selector.startsWith("[data-gb-city=")) {
    const match = selector.match(/^\[data-gb-city="([^"]+)"\]$/);
    if (!match) return false;
    return node.getAttribute("data-gb-city") === match[1];
  }

  if (selector.startsWith("[data-gb-vehicle-id=")) {
    const match = selector.match(/^\[data-gb-vehicle-id="([^"]+)"\]$/);
    if (!match) return false;
    return node.getAttribute("data-gb-vehicle-id") === match[1];
  }

  const parsed = parse(`<div ${selector.slice(1, -1)}></div>`).querySelector("div");
  if (!parsed) return false;
  const expected = attrMap(parsed);
  const actual = attrMap(node);
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function collectMatches(root: HTMLElement, selector: string): HTMLElement[] {
  const all = root.querySelectorAll("*");
  const matches: HTMLElement[] = [];
  for (const node of all) {
    if (matchesElement(node, selector)) matches.push(node);
  }
  if (matchesElement(root, selector)) matches.unshift(root);
  return matches;
}

/** Parses static HTML fixtures into a query port (no network). */
export class HtmlDomQueryPort implements DomQueryPort {
  private readonly root: HTMLElement;

  constructor(html: string) {
    this.root = parse(html);
  }

  static fromHtml(html: string): HtmlDomQueryPort {
    return new HtmlDomQueryPort(html);
  }

  queryText(selector: string): string | null {
    const node = this.queryFirst(selector);
    return node ? node.text.trim() : null;
  }

  queryAttr(selector: string, attribute: string): string | null {
    const node = this.queryFirst(selector);
    if (!node) return null;
    return node.getAttribute(attribute) ?? null;
  }

  queryAll(selector: string): DomNodeSnapshot[] {
    return collectMatches(this.root, selector).map(nodeSnapshot);
  }

  queryAllAttr(selector: string, attribute: string): string[] {
    return collectMatches(this.root, selector)
      .map((node) => node.getAttribute(attribute))
      .filter((value): value is string => typeof value === "string" && value.length > 0);
  }

  exists(selector: string): boolean {
    return collectMatches(this.root, selector).length > 0;
  }

  private queryFirst(selector: string): HTMLElement | null {
    const matches = collectMatches(this.root, selector);
    return matches[0] ?? null;
  }
}

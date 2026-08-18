/** DOM query + interaction ports for page objects (Phase 4D). */

export type DomNodeSnapshot = {
  text: string;
  attributes: Record<string, string>;
};

export interface DomQueryPort {
  queryText(selector: string): string | null;
  queryAttr(selector: string, attribute: string): string | null;
  queryAll(selector: string): DomNodeSnapshot[];
  queryAllAttr(selector: string, attribute: string): string[];
  exists(selector: string): boolean;
}

export interface DomInteractionPort {
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  selectOption(selectSelector: string, value: string): Promise<void>;
}

export interface PomNavigationPort {
  goto(url: string): Promise<void>;
  getCurrentUrl(): string;
}

export class InMemoryDomInteraction implements DomInteractionPort {
  readonly actions: Array<{ kind: "fill" | "click" | "select"; selector: string; value?: string }> = [];

  async fill(selector: string, value: string): Promise<void> {
    this.actions.push({ kind: "fill", selector, value });
  }

  async click(selector: string): Promise<void> {
    this.actions.push({ kind: "click", selector });
  }

  async selectOption(selectSelector: string, value: string): Promise<void> {
    this.actions.push({ kind: "select", selector: selectSelector, value });
  }
}

export class MockPomNavigation implements PomNavigationPort {
  constructor(private currentUrl = "mock://gaadi-bazaar/home") {}

  async goto(url: string): Promise<void> {
    this.currentUrl = url;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }
}

function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || null;
}

export function readText(dom: DomQueryPort, selector: string): string | null {
  return normalizeText(dom.queryText(selector));
}

export function readAttr(dom: DomQueryPort, selector: string, attribute: string): string | null {
  return normalizeText(dom.queryAttr(selector, attribute));
}

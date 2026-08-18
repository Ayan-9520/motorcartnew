/**
 * Normalize live GaadiBazaar HTML into existing data-gb POM shape (Phase 5F).
 * Reuses v1 selectors — does not create a parallel scraper.
 */
import { parse, type HTMLElement } from "node-html-parser";

function textOf(el: HTMLElement | null): string {
  return (el?.text ?? "").replace(/\s+/g, " ").trim();
}

function parseListingInfoRow(card: HTMLElement): { fuel?: string; transmission?: string } {
  const spans = card.querySelectorAll(".used-info-section .row-1 span")
    .map((s) => textOf(s))
    .filter((t) => t && t !== "·" && !/\bkm\b/i.test(t) && !/owner/i.test(t));
  const fuels = /petrol|diesel|cng|electric|hybrid|lpg/i;
  const transmissions = /manual|automatic|amt|cvt|dct|imt/i;
  let fuel: string | undefined;
  let transmission: string | undefined;
  for (const span of spans) {
    if (!fuel && fuels.test(span)) fuel = span;
    if (!transmission && transmissions.test(span)) transmission = span;
  }
  return { fuel, transmission };
}

export function normalizeGaadiBazaarLiveListingHtml(html: string): string {
  const root = parse(html);
  const cards = root.querySelectorAll(".used-card-list");
  for (const card of cards) {
    const link = card.querySelector("a.title");
    const model = card.querySelector(".model");
    const location = card.querySelector(".location");
    const price =
      card.querySelector(".used-price-section .amt") ?? card.querySelector(".used-price-section .price");
    const image = card.querySelector("img.v-image");
    const info = parseListingInfoRow(card);

    const title = `${textOf(link)} ${textOf(model)}`.replace(/\s+/g, " ").trim();
    card.setAttribute("data-gb", "listing-vehicle-card");
    card.setAttribute("data-href", link?.getAttribute("href") ?? "");
    card.setAttribute("data-title", title);
    card.setAttribute("data-price", textOf(price));
    card.setAttribute("data-location", textOf(location));
    card.setAttribute("data-image", image?.getAttribute("src") ?? "");
    if (info.fuel) card.setAttribute("data-fuel", info.fuel);
    if (info.transmission) card.setAttribute("data-transmission", info.transmission);

    if (link) link.setAttribute("data-gb", "listing-vehicle-link");
  }

  const results =
    root.querySelector(".uvl-search-result") ??
    root.querySelector(".used-page-title")?.parentNode ??
    null;
  if (results && "setAttribute" in results) {
    (results as HTMLElement).setAttribute("data-gb", "listing-results");
  } else if (cards[0]?.parentNode && "setAttribute" in cards[0].parentNode) {
    (cards[0].parentNode as HTMLElement).setAttribute("data-gb", "listing-results");
  }

  const next =
    root.querySelector("a[rel='next']") ??
    root.querySelector(".pagination .next") ??
    root.querySelector("[data-gb='listing-next-page']");
  if (next) next.setAttribute("data-gb", "listing-next-page");

  return root.toString();
}

type MakeOfferDetails = {
  usedVehicleIdentifier?: string;
  brandName?: string;
  modelName?: string;
  variant?: string;
  price?: string;
  fuelType?: string;
  thumbImg?: string;
  kmsDriven?: number | string;
  manufactureYear?: string;
};

function extractMakeOfferDetails(html: string): MakeOfferDetails | null {
  const match = html.match(/makeOfferDetails\s*=\s*JSON\.parse\(\s*'(\{[\s\S]*?\})'\s*\)/);
  if (!match?.[1]) return null;
  try {
    const json = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\//g, "/");
    return JSON.parse(json) as MakeOfferDetails;
  } catch {
    return null;
  }
}

function ensureAttrNode(
  root: HTMLElement,
  dataGb: string,
  text: string,
  attrs: Record<string, string> = {},
): void {
  let node = root.querySelector(`[data-gb="${dataGb}"]`);
  if (!node) {
    node = parse(`<div data-gb="${dataGb}"></div>`).firstChild as HTMLElement;
    root.appendChild(node);
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v) node.setAttribute(k, v);
  }
  if (text) node.set_content(text);
}

export function normalizeGaadiBazaarLiveVehicleHtml(html: string, pageUrl: string): string {
  const details = extractMakeOfferDetails(html);
  const root = parse(html);
  const h1 = root.querySelector("h1");
  const titleText = details
    ? [details.manufactureYear, details.brandName, details.modelName, details.variant]
        .filter(Boolean)
        .join(" ")
        .trim()
    : textOf(h1);

  ensureAttrNode(root, "vehicle-title", titleText || textOf(h1), {
    "data-brand": details?.brandName ?? "",
    "data-model": details?.modelName ?? "",
    "data-variant": details?.variant ?? "",
  });
  ensureAttrNode(root, "vehicle-price", details?.price ?? textOf(root.querySelector(".price")));
  ensureAttrNode(root, "vehicle-location", "");
  ensureAttrNode(root, "vehicle-breadcrumb", "", {
    "data-source-url": pageUrl,
    "data-vehicle-url": pageUrl,
  });

  const imageUrl = details?.thumbImg ?? root.querySelector("img.v-image")?.getAttribute("src") ?? "";
  if (imageUrl) {
    ensureAttrNode(root, "vehicle-image-gallery", "", { "data-image": imageUrl });
    let item = root.querySelector(`[data-gb="vehicle-image-item"]`);
    if (!item) {
      item = parse(`<img data-gb="vehicle-image-item" />`).firstChild as HTMLElement;
      root.appendChild(item);
    }
    item.setAttribute("src", imageUrl);
    item.setAttribute("data-src", imageUrl);
  }

  if (details?.fuelType) {
    let row = root.querySelector(`[data-gb="vehicle-spec-row"][data-label="Fuel"]`);
    if (!row) {
      row = parse(
        `<div data-gb="vehicle-spec-row" data-label="Fuel" data-value="${details.fuelType}"></div>`,
      ).firstChild as HTMLElement;
      root.appendChild(row);
    } else {
      row.setAttribute("data-value", details.fuelType);
    }
  }

  // Label/value pairs for Fuel Type from SSR placeholders if present
  const labels = root.querySelectorAll(".car-info-label");
  const values = root.querySelectorAll(".car-info-value");
  for (let i = 0; i < Math.min(labels.length, values.length); i++) {
    const label = textOf(labels[i]!);
    const value = textOf(values[i]!);
    if (!label || !value || value === "-" || value === "- Kms") continue;
    const mapped = label.toLowerCase().includes("fuel") ? "Fuel" : label;
    const row = parse(
      `<div data-gb="vehicle-spec-row" data-label="${mapped}" data-value="${value}"></div>`,
    ).firstChild as HTMLElement;
    root.appendChild(row);
  }

  return root.toString();
}

export function normalizeGaadiBazaarLiveHtml(html: string, pageUrl: string): string {
  if (/used-card-list|uvl-search-result|used-second-hand-.*-for-sale/i.test(html) && /used-card-list/i.test(html)) {
    return normalizeGaadiBazaarLiveListingHtml(html);
  }
  if (/buy-used-|makeOfferDetails|usedVehicleIdentifier/i.test(html) || /\/buy-used-/i.test(pageUrl)) {
    return normalizeGaadiBazaarLiveVehicleHtml(html, pageUrl);
  }
  return html;
}

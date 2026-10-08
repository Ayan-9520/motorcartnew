import type { PartCategorySlug } from "../types";

const CATEGORY_STYLE: Record<PartCategorySlug, { label: string; accent: string; tint: string }> = {
  "engine-parts": { label: "Engine parts", accent: "#0f766e", tint: "#e6f6f3" },
  battery: { label: "Battery", accent: "#b45309", tint: "#fdf3e4" },
  tyres: { label: "Tyres", accent: "#334155", tint: "#eef1f5" },
  "brake-parts": { label: "Brake parts", accent: "#b91c1c", tint: "#fcecec" },
  accessories: { label: "Accessories", accent: "#6d28d9", tint: "#f1ecfc" },
  lubricants: { label: "Lubricants", accent: "#a16207", tint: "#fbf5e2" },
  electronics: { label: "Electronics", accent: "#1d4ed8", tint: "#e9effc" },
  "body-parts": { label: "Body parts", accent: "#15803d", tint: "#e8f6ec" },
  "interior-parts": { label: "Interior", accent: "#9d174d", tint: "#fbeaf1" },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrap(text: string, max: number, lines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur ? `${cur} ${w}` : w).length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = `${kept[lines - 1]!.slice(0, max - 1)}…`;
    return kept;
  }
  return out;
}

function initials(brand: string) {
  const parts = brand.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Branded catalogue tile used when a seller hasn't uploaded product photos. */
export function partArtworkUri(part: { name: string; brand: string | null; categorySlug: PartCategorySlug; sku?: string | null }): string {
  const style = CATEGORY_STYLE[part.categorySlug] ?? CATEGORY_STYLE.accessories;
  const brand = (part.brand ?? "Motorcart").trim();
  const nameWithoutBrand = part.name.toLowerCase().startsWith(brand.toLowerCase())
    ? part.name.slice(brand.length).replace(/^[\s—-]+/, "")
    : part.name;
  const lines = wrap(nameWithoutBrand || part.name, 24, 3);
  const nameSvg = lines
    .map((l, i) => `<text x="300" y="${398 + i * 40}" text-anchor="middle" font-size="30" font-weight="600" fill="#0f172a">${esc(l)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" font-family="Inter, 'Segoe UI', Roboto, Arial, sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${style.tint}"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>
<circle cx="520" cy="80" r="160" fill="${style.accent}" opacity="0.06"/>
<circle cx="60" cy="560" r="120" fill="${style.accent}" opacity="0.05"/>
<circle cx="300" cy="200" r="88" fill="#ffffff" stroke="${style.accent}" stroke-width="6"/>
<text x="300" y="224" text-anchor="middle" font-size="64" font-weight="800" fill="${style.accent}">${esc(initials(brand))}</text>
<text x="300" y="336" text-anchor="middle" font-size="26" font-weight="800" fill="${style.accent}" letter-spacing="3">${esc(brand.toUpperCase().slice(0, 28))}</text>
${nameSvg.replace(/y="(\d+)"/g, (_, y) => `y="${Number(y) - 14}"`)}
<rect x="${300 - (style.label.length * 7 + 28)}" y="502" rx="17" width="${style.label.length * 14 + 56}" height="34" fill="${style.accent}" opacity="0.12"/>
<text x="300" y="525" text-anchor="middle" font-size="17" font-weight="700" fill="${style.accent}" letter-spacing="1.5">${esc(style.label.toUpperCase())}</text>
${part.sku ? `<text x="300" y="572" text-anchor="middle" font-size="16" fill="#64748b" letter-spacing="2">${esc(part.sku)}</text>` : ""}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

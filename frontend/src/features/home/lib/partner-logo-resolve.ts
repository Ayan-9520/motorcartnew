import { buyBrandModelsPath } from "@/features/marketplace/lib/buy-catalog-flow";
import type { HubCategorySlug } from "@/features/marketplace/types";

/** Map API / display slugs → files under /partners/cars */
const CAR_LOGO_SLUG_ALIASES: Record<string, string> = {
  maruti: "maruti",
  "maruti-suzuki": "maruti",
  suzuki: "maruti",
  hyundai: "hyundai",
  tata: "tata",
  "tata-motors": "tata",
  mahindra: "mahindra",
  honda: "honda",
  toyota: "toyota",
  kia: "kia",
  bmw: "bmw",
  mercedes: "mercedes",
  "mercedes-benz": "mercedes",
  skoda: "skoda",
  nissan: "nissan",
  ford: "ford",
  volkswagen: "volkswagen",
  vw: "volkswagen",
  mg: "mg",
  "mg-motor": "mg",
  jeep: "jeep",
  renault: "renault",
  audi: "audi",
  citroen: "citroen",
  jaguar: "jaguar",
  landrover: "landrover",
  "land-rover": "landrover",
  porsche: "porsche",
  lexus: "lexus",
  isuzu: "isuzu",
  volvo: "volvo",
  ashok: "ashok-leyland",
  "ashok-leyland": "ashok-leyland",
  leyland: "ashok-leyland",
  royal: "royal-enfield",
  "royal-enfield": "royal-enfield",
  enfield: "royal-enfield",
  bajaj: "bajaj",
  hero: "hero",
  "hero-motocorp": "hero",
  "tv-s": "tvs",
  tvs: "tvs",
  yamaha: "yamaha",
  ktm: "ktm",
  ola: "ola",
  "ola-electric": "ola",
  ather: "ather",
  "ather-energy": "ather",
  jawa: "jawa",
  triumph: "triumph",
  harley: "harley",
  "harley-davidson": "harley",
  vida: "vida",
  ultraviolette: "ultraviolette",
  ampere: "ampere",
  benelli: "benelli",
  "suzuki-moto": "suzuki-moto",
  "suzuki-motorcycle": "suzuki-moto",
  "bmw-moto": "bmw-moto",
  "bmw-motorrad": "bmw-moto",
  piaggio: "piaggio",
  ape: "piaggio",
  atul: "atul",
  "atul-auto": "atul",
  force: "force",
  "force-motors": "force",
  "mahindra-mark": "mahindra-mark",
  eicher: "eicher",
  "ve-commercial": "eicher",
  bharatbenz: "bharatbenz",
  "bharat-benz": "bharatbenz",
};

const BIKE_BRAND_HINTS = [
  "royal",
  "enfield",
  "bajaj",
  "hero",
  "tvs",
  "yamaha",
  "ktm",
  "harley",
  "ola",
  "ather",
  "jawa",
  "triumph",
  "vida",
  "ultraviolette",
  "ampere",
  "benelli",
  "suzuki-moto",
];

export function normalizePartnerSlug(raw: string): string {
  return raw
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolvePartnerCarLogoPath(slugOrName: string): string {
  const slug = normalizePartnerSlug(slugOrName);
  const file = CAR_LOGO_SLUG_ALIASES[slug] ?? slug;
  return `/partners/cars/${file}.svg?v20260825auto`;
}

export function partnerBrandBuyHref(name: string, slug?: string): string {
  const key = normalizePartnerSlug(slug ?? name);
  const hub: HubCategorySlug = BIKE_BRAND_HINTS.some((h) => key.includes(h)) ? "bikes" : "cars";
  const brandLabel = name.trim() || slug || key;
  return buyBrandModelsPath(hub, "new", brandLabel);
}

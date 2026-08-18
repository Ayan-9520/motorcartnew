import type { SelectorRegistry } from "../selectors/selector-registry";
import type { DomQueryPort, PomNavigationPort } from "../dom/dom-ports";
import { readAttr, readText } from "../dom/dom-ports";
import {
  GAADI_BAZAAR_MOCK_URL_RESOLVER,
  type GaadiBazaarUrlResolver,
  type VehicleDetailView,
  type VehicleSpecification,
} from "../pom-types";

export type GaadiBazaarVehiclePageDeps = {
  dom: DomQueryPort;
  selectors: SelectorRegistry;
  navigation: PomNavigationPort;
  urls?: GaadiBazaarUrlResolver;
};

/** GaadiBazaar vehicle detail page object (Phase 4D). */
export class GaadiBazaarVehiclePage {
  private readonly selectors;
  private readonly urls: GaadiBazaarUrlResolver;

  constructor(private readonly deps: GaadiBazaarVehiclePageDeps) {
    this.selectors = deps.selectors.vehicle;
    this.urls = deps.urls ?? GAADI_BAZAAR_MOCK_URL_RESOLVER;
  }

  async open(vehicleId: string): Promise<void> {
    await this.deps.navigation.goto(this.urls.vehicle(vehicleId));
  }

  async openByUrl(url: string): Promise<void> {
    await this.deps.navigation.goto(url);
  }

  getTitle(): string | null {
    return readText(this.deps.dom, this.selectors.title);
  }

  getPrice(): string | null {
    return readText(this.deps.dom, this.selectors.price);
  }

  getLocation(): string | null {
    return readText(this.deps.dom, this.selectors.location);
  }

  getImages(): string[] {
    const fromItems = this.deps.dom
      .queryAllAttr(this.selectors.imageItem, "data-src")
      .concat(this.deps.dom.queryAllAttr(this.selectors.imageItem, "src"));

    const galleryImages = this.deps.dom.queryAllAttr(this.selectors.imageGallery, "data-image");
    const unique = [...new Set([...fromItems, ...galleryImages].filter(Boolean))];
    return unique;
  }

  getSpecifications(): VehicleSpecification[] {
    const rows = this.deps.dom.queryAll(this.selectors.specificationRow);
    if (rows.length > 0) {
      return rows
        .map((row) => ({
          label: row.attributes["data-label"] ?? "",
          value: row.attributes["data-value"] ?? row.text,
        }))
        .filter((spec) => spec.label && spec.value);
    }

    const labels = this.deps.dom.queryAll(this.selectors.specificationLabel);
    const values = this.deps.dom.queryAll(this.selectors.specificationValue);
    const specs: VehicleSpecification[] = [];
    for (let i = 0; i < Math.min(labels.length, values.length); i++) {
      specs.push({ label: labels[i]!.text, value: values[i]!.text });
    }
    return specs;
  }

  getBreadcrumb(): string | null {
    return readText(this.deps.dom, this.selectors.breadcrumb);
  }

  getBrochureUrl(): string | null {
    return readAttr(this.deps.dom, this.selectors.brochureLink, "href");
  }

  getVehicleUrl(): string | null {
    return (
      readAttr(this.deps.dom, this.selectors.breadcrumb, "data-vehicle-url") ??
      readAttr(this.deps.dom, this.selectors.breadcrumb, "data-source-url") ??
      this.deps.navigation.getCurrentUrl()
    );
  }

  getBrand(): string | null {
    return readAttr(this.deps.dom, this.selectors.title, "data-brand");
  }

  getModel(): string | null {
    return readAttr(this.deps.dom, this.selectors.title, "data-model");
  }

  getVariant(): string | null {
    return readAttr(this.deps.dom, this.selectors.title, "data-variant");
  }

  getDetailView(): VehicleDetailView {
    return {
      title: this.getTitle() ?? "",
      priceText: this.getPrice(),
      locationText: this.getLocation(),
      images: this.getImages(),
      specifications: this.getSpecifications(),
      sourceUrl:
        readAttr(this.deps.dom, this.selectors.breadcrumb, "data-source-url") ??
        this.deps.navigation.getCurrentUrl(),
    };
  }

  getCurrentUrl(): string {
    return this.deps.navigation.getCurrentUrl();
  }
}

export function createGaadiBazaarVehiclePage(deps: GaadiBazaarVehiclePageDeps): GaadiBazaarVehiclePage {
  return new GaadiBazaarVehiclePage(deps);
}

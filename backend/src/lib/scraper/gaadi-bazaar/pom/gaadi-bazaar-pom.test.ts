import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  SelectorRegistry,
  GAADI_BAZAAR_SELECTORS_V1,
  SUPPORTED_SELECTOR_VERSIONS,
  HtmlDomQueryPort,
  InMemoryDomInteraction,
  MockPomNavigation,
  createGaadiBazaarHomePage,
  createGaadiBazaarListingPage,
  createGaadiBazaarVehiclePage,
  createGaadiBazaarPomBundle,
  resolveSelectorTemplate,
  GAADI_BAZAAR_MOCK_URLS,
} from "./index";
import { GaadiBazaarVehiclePage } from "./pages/gaadi-bazaar-vehicle-page";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "html");

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

describe("selector maps", () => {
  it("supports versioned selector registry", () => {
    const registry = SelectorRegistry.create("v1");
    assert.equal(registry.version, "v1");
    assert.equal(registry.home.searchInput, GAADI_BAZAAR_SELECTORS_V1.home.searchInput);
    assert.deepEqual(SUPPORTED_SELECTOR_VERSIONS, ["v1"]);
  });

  it("resolves selector templates with variables", () => {
    const selector = resolveSelectorTemplate('[data-gb-city="{city}"]', { city: "delhi" });
    assert.equal(selector, '[data-gb-city="delhi"]');
  });

  it("rejects unknown selector versions", () => {
    assert.throws(() => SelectorRegistry.fromVersionString("v99"), /Unsupported/);
  });
});

describe("GaadiBazaarHomePage", () => {
  it("opens mock home URL and exposes search methods", async () => {
    const dom = HtmlDomQueryPort.fromHtml(loadFixture("home.html"));
    const navigation = new MockPomNavigation();
    const interaction = new InMemoryDomInteraction();
    const selectors = SelectorRegistry.create("v1");

    const page = createGaadiBazaarHomePage({ dom, selectors, navigation, interaction });

    await page.open();
    assert.equal(page.getCurrentUrl(), GAADI_BAZAAR_MOCK_URLS.home);
    assert.equal(page.isSearchReady(), true);
    assert.match(page.getHeroBannerText() ?? "", /Find your next vehicle/);

    await page.search("Hyundai Creta");
    assert.ok(interaction.actions.some((a) => a.kind === "fill" && a.value === "Hyundai Creta"));

    await page.selectCity("Delhi");
    assert.ok(interaction.actions.some((a) => a.kind === "select" && a.value === "Delhi"));
  });
});

describe("GaadiBazaarListingPage", () => {
  it("reads vehicle cards from listing fixture", async () => {
    const dom = HtmlDomQueryPort.fromHtml(loadFixture("listing.html"));
    const navigation = new MockPomNavigation(GAADI_BAZAAR_MOCK_URLS.listing);
    const interaction = new InMemoryDomInteraction();
    const selectors = SelectorRegistry.create("v1");

    const page = createGaadiBazaarListingPage({ dom, selectors, navigation, interaction });

    await page.open("creta");
    assert.match(page.getCurrentUrl(), /listing\?q=creta/);

    const cards = page.getVehicleCards();
    assert.equal(cards.length, 2);
    assert.equal(cards[0]?.title, "2025 Hyundai Creta SX(O) Diesel AT");
    assert.equal(cards[0]?.priceText, "₹14,90,000");
    assert.equal(cards[0]?.locationText, "Delhi");
    assert.equal(cards[1]?.href, "mock://gaadi-bazaar/vehicle/gb-swift-67890");
    assert.equal(page.getCurrentPageNumber(), "1");
    assert.equal(page.hasResults(), true);
  });

  it("supports pagination and openVehicle navigation", async () => {
    const dom = HtmlDomQueryPort.fromHtml(loadFixture("listing.html"));
    const navigation = new MockPomNavigation(GAADI_BAZAAR_MOCK_URLS.listing);
    const interaction = new InMemoryDomInteraction();
    const page = createGaadiBazaarListingPage({
      dom,
      selectors: SelectorRegistry.create("v1"),
      navigation,
      interaction,
    });

    await page.goToNextPage();
    assert.ok(interaction.actions.some((a) => a.kind === "click"));

    const href = await page.openVehicle(0);
    assert.equal(href, "mock://gaadi-bazaar/vehicle/gb-creta-12345");
    assert.equal(navigation.getCurrentUrl(), "mock://gaadi-bazaar/vehicle/gb-creta-12345");
  });
});

describe("GaadiBazaarVehiclePage", () => {
  it("reads price, location, images, and specifications", async () => {
    const dom = HtmlDomQueryPort.fromHtml(loadFixture("vehicle.html"));
    const navigation = new MockPomNavigation();
    const page = createGaadiBazaarVehiclePage({
      dom,
      selectors: SelectorRegistry.create("v1"),
      navigation,
    });

    await page.open("gb-creta-12345");
    assert.equal(page.getCurrentUrl(), GAADI_BAZAAR_MOCK_URLS.vehicle("gb-creta-12345"));

    assert.equal(page.getPrice(), "₹14,90,000");
    assert.equal(page.getLocation(), "Delhi, Delhi");
    assert.equal(page.getImages().length, 2);
    assert.ok(page.getImages()[0]?.includes("creta-front.jpg"));

    const specs = page.getSpecifications();
    assert.ok(specs.some((s) => s.label === "Fuel" && s.value === "Diesel"));
    assert.ok(specs.some((s) => s.label === "Transmission" && s.value === "Automatic"));

    const detail = page.getDetailView();
    assert.match(detail.title, /Hyundai Creta/);
    assert.equal(detail.specifications.length, 3);
  });
});

describe("POM bundle", () => {
  it("creates all page objects with shared selector registry", () => {
    const dom = HtmlDomQueryPort.fromHtml(loadFixture("home.html"));
    const bundle = createGaadiBazaarPomBundle({
      dom,
      navigation: new MockPomNavigation(),
      interaction: new InMemoryDomInteraction(),
    });
    assert.equal(bundle.selectors.version, "v1");
    assert.ok(bundle.home);
    assert.ok(bundle.listing);
    assert.ok(bundle.vehicle);
  });
});

describe("no persistence side effects", () => {
  it("page objects do not expose save/import/database APIs", () => {
    const proto = GaadiBazaarVehiclePage.prototype as unknown as Record<string, unknown>;
    assert.equal("save" in proto, false);
    assert.equal("import" in proto, false);
    assert.equal("persist" in proto, false);
  });
});

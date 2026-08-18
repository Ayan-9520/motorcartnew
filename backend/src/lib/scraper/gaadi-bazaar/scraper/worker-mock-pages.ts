import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearMockPages,
  registerMockPage,
} from "../../../playwright-worker/drivers/mock-browser-driver";
import { GAADI_BAZAAR_MOCK_URLS } from "../pom/pom-types";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../pom/fixtures/html");

function read(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

/** Registers GaadiBazaar HTML fixtures with PlaywrightWorker mock driver (no HTTP). */
export function registerGaadiBazaarWorkerMockPages(): void {
  registerMockPage("gaadi-bazaar/home", read("home.html"));
  registerMockPage("gaadi-bazaar/listing", read("listing.html"));
  registerMockPage("gaadi-bazaar/listing/page-2", read("listing-page-2.html"));
  registerMockPage("gaadi-bazaar/vehicle/gb-creta-12345", read("vehicle.html"));
  registerMockPage("gaadi-bazaar/vehicle/gb-swift-67890", read("vehicle-swift.html"));
  registerMockPage("gaadi-bazaar/vehicle/gb-nexon-11111", read("vehicle-nexon.html"));
}

export function clearGaadiBazaarWorkerMockPages(): void {
  clearMockPages();
}

export function gaadiBazaarListingMockUrl(page = 1): string {
  return page <= 1 ? GAADI_BAZAAR_MOCK_URLS.listing : `${GAADI_BAZAAR_MOCK_URLS.listing}?page=${page}`;
}

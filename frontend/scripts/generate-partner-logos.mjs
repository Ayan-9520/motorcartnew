/**
 * Generates transparent brand SVGs into public/partners/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as simpleIcons from "simple-icons";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const banksDir = path.join(root, "public", "partners", "banks");
const carsDir = path.join(root, "public", "partners", "cars");

const allIcons = Object.values(simpleIcons).filter(
  (i) => i && typeof i === "object" && i.slug && i.path
);

function getBySlug(slug) {
  return allIcons.find((i) => i.slug === slug);
}

function toSvg(icon) {
  return `<svg fill="#${icon.hex}" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>${icon.title}</title><path d="${icon.path}"/></svg>\n`;
}

/** Text wordmark — no background rect, brand color only */
function wordmark(title, color, size = 10) {
  const t = title.length > 14 ? 8.5 : size;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" fill="none" role="img"><title>${title}</title><text x="60" y="16" text-anchor="middle" fill="${color}" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-size="${t}" font-weight="700" letter-spacing="-0.02em">${title}</text></svg>\n`;
}

const BANKS = [
  { file: "sbi.svg", slug: null, custom: () => wordmark("SBI", "#22409A", 14) },
  { file: "hdfcbank.svg", slug: "hdfcbank" },
  { file: "icicibank.svg", slug: "icicibank" },
  { file: "axisbank.svg", slug: null, custom: () => toSvg({ title: "Axis Bank", hex: "971A4D", path: "M11.978 1.596 0 22.404h7.453l8.265-14.369Zm.027 12.896 4.533 7.903H24l-4.533-7.903z" }) },
  { file: "kotak.svg", slug: null, custom: () => wordmark("Kotak", "#ED1C24", 12) },
  { file: "bob.svg", slug: null, custom: () => wordmark("Bank of Baroda", "#F15A29", 9) },
  { file: "pnb.svg", slug: null, custom: () => wordmark("PNB", "#9B261F", 14) },
  { file: "bajaj.svg", slug: null, custom: () => wordmark("Bajaj Finance", "#0072BC", 9) },
  { file: "idfc.svg", slug: null, custom: () => wordmark("IDFC First", "#9D1D27", 10) },
  { file: "yes.svg", slug: null, custom: () => wordmark("YES Bank", "#00428E", 10) },
  { file: "indusind.svg", slug: null, custom: () => wordmark("IndusInd", "#98272A", 10) },
  { file: "union.svg", slug: null, custom: () => wordmark("Union Bank", "#027B3F", 9) },
  { file: "canara.svg", slug: null, custom: () => wordmark("Canara Bank", "#00A0E3", 9) },
  { file: "federal.svg", slug: null, custom: () => wordmark("Federal Bank", "#004F9F", 8.5) },
  { file: "boi.svg", slug: null, custom: () => wordmark("Bank of India", "#F16E22", 9) },
  { file: "iob.svg", slug: null, custom: () => wordmark("IOB", "#1B3281", 14) },
  { file: "uco.svg", slug: null, custom: () => wordmark("UCO Bank", "#0D3B7C", 10) },
  { file: "au.svg", slug: null, custom: () => wordmark("AU Bank", "#6D2C91", 11) },
  { file: "tata-capital.svg", slug: null, custom: () => wordmark("Tata Capital", "#486AAE", 9) },
  { file: "chola.svg", slug: null, custom: () => wordmark("Chola Finance", "#E31837", 9) },
  { file: "mahindra-finance.svg", slug: "mahindra" },
  { file: "lic.svg", slug: null, custom: () => wordmark("LIC", "#1E3A8A", 14) },
];

const CARS = [
  { file: "hyundai.svg", slug: "hyundai" },
  { file: "maruti.svg", slug: null, custom: () => wordmark("Maruti Suzuki", "#1D4FA3", 8) },
  { file: "tata.svg", slug: "tata" },
  { file: "mahindra.svg", slug: "mahindra" },
  { file: "honda.svg", slug: "honda" },
  { file: "toyota.svg", slug: "toyota" },
  { file: "kia.svg", slug: "kia" },
  { file: "bmw.svg", slug: "bmw" },
  { file: "mercedes.svg", slug: "mercedes" },
  { file: "skoda.svg", slug: "skoda" },
  { file: "nissan.svg", slug: "nissan" },
  { file: "ford.svg", slug: "ford" },
  { file: "volkswagen.svg", slug: "volkswagen" },
  { file: "mg.svg", slug: "mg" },
  { file: "jeep.svg", slug: "jeep" },
  { file: "renault.svg", slug: "renault" },
  { file: "audi.svg", slug: "audi" },
  { file: "citroen.svg", slug: "citroen" },
  { file: "jaguar.svg", slug: "jaguar" },
  { file: "landrover.svg", slug: "landrover" },
  { file: "porsche.svg", slug: "porsche" },
  { file: "lexus.svg", slug: null, custom: () => wordmark("Lexus", "#1A1A1A", 12) },
  { file: "isuzu.svg", slug: null, custom: () => wordmark("Isuzu", "#E2231A", 12) },
  { file: "volvo.svg", slug: "volvo" },
  { file: "byd.svg", slug: null, custom: () => wordmark("BYD", "#FF3737", 14) },
  { file: "mini.svg", slug: null, custom: () => wordmark("MINI", "#000000", 13) },
  { file: "maserati.svg", slug: null, custom: () => wordmark("Maserati", "#0C2340", 10) },
  { file: "bentley.svg", slug: null, custom: () => wordmark("Bentley", "#1A1A1A", 11) },
  { file: "aston-martin.svg", slug: null, custom: () => wordmark("Aston Martin", "#006F62", 7.5) },
  { file: "ferrari.svg", slug: null, custom: () => wordmark("Ferrari", "#F40000", 11) },
  { file: "lamborghini.svg", slug: null, custom: () => wordmark("Lamborghini", "#DDB321", 8) },
  { file: "lotus.svg", slug: null, custom: () => wordmark("Lotus", "#FFD800", 12) },
  { file: "vinfast.svg", slug: null, custom: () => wordmark("VinFast", "#1464F4", 11) },
];

function writeIcons(list, dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const item of list) {
    let content;
    if (item.slug) {
      const icon = getBySlug(item.slug);
      if (!icon) {
        console.warn(`Skip (no icon): ${item.file} / ${item.slug}`);
        continue;
      }
      content = toSvg(icon);
    } else if (item.custom) {
      content = item.custom();
    } else {
      continue;
    }
    fs.writeFileSync(path.join(dir, item.file), content, "utf8");
    console.log(`✓ ${item.file}`);
  }
}

console.log("Banks:");
writeIcons(BANKS, banksDir);
console.log("\nCars:");
writeIcons(CARS, carsDir);
console.log("\nDone.");

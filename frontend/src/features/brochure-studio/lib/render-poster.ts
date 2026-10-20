import { photoAngleLabel } from "@/lib/photo-angles";
import type { BrochureDesign, BrochureVehicle } from "../types";
import { POSTER_SIZES } from "../types";
import { comparisonRows, emiFor, formatLakh, formatRupees, ownerLabel, specValue } from "./brochure-model";
import {
  badgeBurst,
  checkIcon,
  crossIcon,
  drawContain,
  drawCover,
  drawLines,
  fillRound,
  fitFont,
  font,
  hexToRgba,
  onColor,
  phoneIcon,
  pinIcon,
  shade,
  strokeRound,
  withShadow,
  wrapText,
  type Ctx,
} from "./canvas-kit";

export type PosterAssets = {
  hero: HTMLImageElement | null;
  secondary: HTMLImageElement | null;
  gallery: { img: HTMLImageElement | null; label: string }[];
  compareHero: HTMLImageElement | null;
  dealerLogo: HTMLImageElement | null;
  brandLight: HTMLImageElement | null;
  brandDark: HTMLImageElement | null;
  qr: HTMLImageElement | null;
};

type R = {
  ctx: Ctx;
  W: number;
  H: number;
  d: BrochureDesign;
  v: BrochureVehicle;
  cmp: BrochureVehicle | null;
  a: PosterAssets;
};

const PAD = 40;
const INK = "#0f172a";
const MUTED = "#475569";
const LINE = "#e2e8f0";

/* ------------------------------------------------------------------ */
/* Shared header / footer                                               */
/* ------------------------------------------------------------------ */

function headerHeight(r: R) {
  return r.d.branding.showQr ? 150 : 128;
}

function drawHeader(r: R, dark = false) {
  const { ctx, W, d, a } = r;
  const h = headerHeight(r);
  if (!dark) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = d.colors.primary;
    ctx.fillRect(0, h - 5, W, 5);
  }
  const brand = dark ? a.brandDark ?? a.brandLight : a.brandLight;
  if (brand) drawContain(ctx, brand, PAD, 30, 300, h - 64, "left");
  else {
    font(ctx, 44, 800);
    ctx.fillStyle = dark ? "#ffffff" : d.colors.primary;
    ctx.fillText("MotorCart", PAD, h / 2 + 14);
  }

  let right = W - PAD;
  if (d.branding.showQr && a.qr) {
    const q = 100;
    const qx = right - q;
    fillRound(ctx, qx - 6, 12, q + 12, q + 12, 12, "#ffffff");
    ctx.drawImage(a.qr, qx, 18, q, q);
    font(ctx, 14, 600);
    ctx.fillStyle = dark ? "#ffffff" : MUTED;
    ctx.textAlign = "center";
    ctx.fillText("Scan to Enquire", qx + q / 2, 18 + q + 24);
    ctx.textAlign = "left";
    right = qx - 22;
  }

  const textW = Math.min(420, right - 360);
  let logoW = 0;
  if (d.branding.showDealerLogo && a.dealerLogo) {
    const rect = drawContain(ctx, a.dealerLogo, right - 84, (h - 84) / 2 - 4, 84, 84, "right");
    logoW = rect.w ? rect.w + 16 : 0;
  }
  const tx = right - logoW;
  ctx.textAlign = "right";
  ctx.fillStyle = dark ? "#ffffff" : INK;
  fitFont(ctx, d.branding.dealerName || "Your Dealership", textW, 30, 18, 800);
  ctx.fillText(d.branding.dealerName || "Your Dealership", tx, h / 2 - 16);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.85)" : MUTED;
  fitFont(ctx, d.branding.dealerTagline, textW, 18, 13, 500);
  ctx.fillText(d.branding.dealerTagline, tx, h / 2 + 12);
  if (d.branding.city) {
    fitFont(ctx, d.branding.city, textW - 24, 18, 13, 600);
    const cw = ctx.measureText(d.branding.city).width;
    ctx.fillStyle = dark ? "#ffffff" : INK;
    ctx.fillText(d.branding.city, tx, h / 2 + 40);
    pinIcon(ctx, tx - cw - 14, h / 2 + 34, 20, d.colors.accent);
  }
  ctx.textAlign = "left";
  return h;
}

function footerHeight(r: R) {
  return r.d.branding.showContact ? 128 : 84;
}

function drawFooter(r: R) {
  const { ctx, W, H, d, a } = r;
  const h = footerHeight(r);
  const y = H - h;
  ctx.fillStyle = d.colors.dark;
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = d.colors.accent;
  ctx.fillRect(0, y, W, 6);

  const cy = y + 6 + (h - 6) / 2;
  let x = PAD;
  const circle = 72;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + circle / 2, cy, circle / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  if (d.branding.showDealerLogo && a.dealerLogo) drawContain(ctx, a.dealerLogo, x + 8, cy - circle / 2 + 8, circle - 16, circle - 16);
  else {
    font(ctx, 34, 800);
    ctx.fillStyle = d.colors.primary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((d.branding.dealerName || "M").charAt(0).toUpperCase(), x + circle / 2, cy + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  x += circle + 18;

  const ctaText = d.content.ctaText || "Enquire Now";
  font(ctx, 24, 800);
  const ctaW = Math.min(300, ctx.measureText(ctaText).width + 56);
  const ctaX = W - PAD - ctaW;
  let leftLimit = ctaX - 24;

  if (d.branding.showContact && d.branding.phone) {
    font(ctx, 32, 800);
    const pw = ctx.measureText(d.branding.phone).width;
    const px = ctaX - 28 - pw;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(d.branding.phone, px, cy + 12);
    phoneIcon(ctx, px - 26, cy, 30, d.colors.accent);
    leftLimit = px - 56;
  }

  const nameW = Math.max(160, leftLimit - x);
  ctx.fillStyle = "#ffffff";
  fitFont(ctx, d.branding.dealerName || "Your Dealership", nameW, 28, 16, 800);
  ctx.fillText(d.branding.dealerName || "Your Dealership", x, d.branding.showContact ? cy - 14 : cy + 10);
  if (d.branding.showContact) {
    let lx = x;
    if (d.branding.city) {
      pinIcon(ctx, lx + 8, cy + 10, 18, d.colors.accent);
      font(ctx, 17, 600);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(d.branding.city, lx + 22, cy + 16);
      lx += 22 + ctx.measureText(d.branding.city).width + 16;
    }
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const services = d.branding.services;
    if (services && lx < leftLimit - 60) {
      fitFont(ctx, services, leftLimit - lx, 15, 11, 500);
      const line = wrapText(ctx, services, leftLimit - lx, 1)[0] ?? "";
      ctx.fillText(line, lx, cy + 16);
    }
  }

  fillRound(ctx, ctaX, cy - 30, ctaW, 60, 14, d.colors.accent);
  ctx.fillStyle = onColor(d.colors.accent);
  fitFont(ctx, ctaText, ctaW - 32, 24, 14, 800);
  ctx.textAlign = "center";
  ctx.fillText(ctaText, ctaX + ctaW / 2, cy + 9);
  ctx.textAlign = "left";
  return h;
}

function drawDisclaimer(r: R, bottomY: number, dark = false) {
  const { ctx, W, d } = r;
  const needs = /\*/.test(d.content.priceText) || r.d.template === "finance_offer";
  if (!needs) return;
  font(ctx, 13, 500);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.55)";
  ctx.textAlign = "right";
  ctx.fillText("*T&C apply. Prices, EMI & offers are indicative and may change.", W - PAD, bottomY - 10);
  ctx.textAlign = "left";
}

function watermark(r: R, x: number, y: number, w: number, h: number) {
  if (!r.d.branding.showWatermark) return;
  const { ctx } = r;
  const text = `${r.d.branding.dealerName || "MotorCart"} · MotorCart`;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-Math.PI / 7);
  font(ctx, 26, 800);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.strokeStyle = "rgba(15,23,42,0.08)";
  ctx.lineWidth = 1;
  const step = ctx.measureText(text).width + 70;
  for (let gy = -h; gy < h; gy += 120) {
    for (let gx = -w; gx < w; gx += step) {
      ctx.fillText(text, gx + (gy / 120) * 40, gy);
      ctx.strokeText(text, gx + (gy / 120) * 40, gy);
    }
  }
  ctx.restore();
}

function bgLight(r: R) {
  const { ctx, W, H, d } = r;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(d.colors.primary, 0.92));
  g.addColorStop(1, "#ffffff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function vehicleName(v: BrochureVehicle) {
  return [v.brand, v.model].filter(Boolean).join(" ") || v.title;
}

/* ------------------------------------------------------------------ */
/* 1. Feature highlights                                                 */
/* ------------------------------------------------------------------ */

function featureHighlights(r: R) {
  const { ctx, W, H, d, v, a } = r;
  bgLight(r);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;

  const features = d.content.features.filter(Boolean).slice(0, 10);
  const rows = H >= 1300 ? 2 : 1;
  const perRow = 5;
  const shown = features.slice(0, rows * perRow);
  const usedRows = Math.max(1, Math.ceil(shown.length / perRow));
  const gap = 16;
  const tileW = (W - PAD * 2 - gap * (perRow - 1)) / perRow;
  const tileH = H >= 1800 ? 260 : 214;
  const gridH = shown.length ? usedRows * tileH + (usedRows - 1) * gap : 0;

  // Title block
  const ty = top + 30;
  ctx.fillStyle = d.colors.primary;
  font(ctx, 22, 800);
  ctx.fillText(v.brand.toUpperCase(), PAD, ty + 18);
  const titleW = W * 0.62 - PAD;
  ctx.fillStyle = INK;
  fitFont(ctx, d.content.headline.toUpperCase(), titleW, 54, 28, 900, true);
  ctx.fillText(d.content.headline.toUpperCase(), PAD, ty + 76);
  const modelText = `${v.model}${v.variant ? ` ${v.variant}` : ""}`.toUpperCase();
  ctx.fillStyle = d.colors.primary;
  fitFont(ctx, modelText, titleW, 72, 30, 900);
  ctx.fillText(modelText, PAD, ty + 150);

  const tagX = W * 0.64;
  ctx.fillStyle = INK;
  font(ctx, 28, 800);
  const tagLines = wrapText(ctx, d.content.tagline, W - PAD - tagX, d.content.priceText ? 2 : 3);
  drawLines(ctx, tagLines, tagX, ty + 48, 36);
  if (d.content.priceText) {
    ctx.fillStyle = d.colors.primary;
    fitFont(ctx, d.content.priceText, W - PAD - tagX, 36, 20, 900);
    ctx.fillText(d.content.priceText, tagX, ty + 48 + tagLines.length * 36 + 14);
  }

  const heroTop = ty + 180;
  const heroBottom = bottom - 24 - gridH - (gridH ? 24 : 0);
  const heroH = Math.max(200, heroBottom - heroTop);
  const hasSecond = Boolean(a.secondary);
  const heroW = hasSecond ? (W - PAD * 2) * 0.62 : W - PAD * 2;
  withShadow(ctx, 24, "rgba(15,23,42,0.18)", () => fillRound(ctx, PAD, heroTop, heroW, heroH, 24, "#ffffff"));
  drawCover(ctx, a.hero, PAD, heroTop, heroW, heroH, 24);
  watermark(r, PAD, heroTop, heroW, heroH);
  if (hasSecond) {
    const sx = PAD + heroW + 18;
    const sw = W - PAD - sx;
    withShadow(ctx, 24, "rgba(15,23,42,0.18)", () => fillRound(ctx, sx, heroTop, sw, heroH, 24, "#ffffff"));
    drawCover(ctx, a.secondary, sx, heroTop, sw, heroH, 24);
  }

  const gy = heroTop + heroH + 24;
  const photos = a.gallery.filter((g) => g.img).slice(1);
  shown.forEach((text, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = PAD + col * (tileW + gap);
    const y = gy + row * (tileH + gap);
    withShadow(ctx, 14, "rgba(15,23,42,0.12)", () => fillRound(ctx, x, y, tileW, tileH, 16, "#ffffff"), 4);
    const photoH = tileH * 0.5;
    const photo = photos.length ? photos[i % photos.length]!.img : null;
    if (photo) drawCover(ctx, photo, x, y, tileW, photoH, 16);
    else {
      const g = ctx.createLinearGradient(x, y, x + tileW, y + photoH);
      g.addColorStop(0, d.colors.primary);
      g.addColorStop(1, shade(d.colors.primary, 0.35));
      fillRound(ctx, x, y, tileW, photoH, 16, g);
      font(ctx, 72, 900);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.textAlign = "right";
      ctx.fillText(String(i + 1), x + tileW - 12, y + photoH - 10);
      ctx.textAlign = "left";
    }
    ctx.beginPath();
    ctx.arc(x + 26, y + 26, 20, 0, Math.PI * 2);
    ctx.fillStyle = d.colors.accent;
    ctx.fill();
    font(ctx, 20, 900);
    ctx.fillStyle = onColor(d.colors.accent);
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), x + 26, y + 33);
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    font(ctx, 19, 700);
    const lines = wrapText(ctx, text, tileW - 24, 3);
    drawLines(ctx, lines, x + 12, y + photoH + 30, 24);
  });

  drawDisclaimer(r, bottom);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 2. Comparison                                                         */
/* ------------------------------------------------------------------ */

function comparison(r: R) {
  const { ctx, W, H, d, v, cmp, a } = r;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;

  const bandH = Math.min(560, (bottom - top) * 0.5);
  const g = ctx.createLinearGradient(0, top, 0, top + bandH);
  g.addColorStop(0, d.colors.primary);
  g.addColorStop(1, shade(d.colors.primary, -0.35));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, bandH);

  const colW = (W - PAD * 2 - 120) / 2;
  const nameA = vehicleName(v).toUpperCase();
  const nameB = cmp ? vehicleName(cmp).toUpperCase() : "CHOOSE A CAR";
  ctx.fillStyle = "#ffffff";
  fitFont(ctx, nameA, colW, 44, 22, 900);
  ctx.textAlign = "center";
  ctx.fillText(nameA, PAD + colW / 2, top + 62);
  fitFont(ctx, nameB, colW, 44, 22, 900);
  ctx.fillText(nameB, W - PAD - colW / 2, top + 62);
  ctx.beginPath();
  ctx.arc(W / 2, top + 50, 44, 0, Math.PI * 2);
  ctx.fillStyle = d.colors.accent;
  ctx.fill();
  font(ctx, 36, 900, true);
  ctx.fillStyle = onColor(d.colors.accent);
  ctx.fillText("VS", W / 2, top + 63);
  font(ctx, 20, 600);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(d.content.headline, W / 2, top + 120);
  ctx.textAlign = "left";

  const photoTop = top + 140;
  const photoH = Math.max(160, bandH - 140 - 80);
  const pw = (W - PAD * 2 - 30) / 2;
  drawCover(ctx, a.hero, PAD, photoTop, pw, photoH, 20, shade(d.colors.primary, 0.2));
  drawCover(ctx, a.compareHero, PAD + pw + 30, photoTop, pw, photoH, 20, shade(d.colors.primary, 0.2));
  watermark(r, PAD, photoTop, pw, photoH);

  const pill = (x: number, label: string, price: string, fill: string) => {
    const py = photoTop + photoH + 18;
    const ph = 54;
    fillRound(ctx, x, py, pw, ph, 14, "#ffffff");
    font(ctx, 20, 800);
    ctx.fillStyle = INK;
    const lw = Math.min(pw * 0.45, ctx.measureText(label).width + 28);
    fitFont(ctx, label, lw - 20, 20, 12, 800);
    ctx.fillText(label, x + 14, py + 35);
    fillRound(ctx, x + lw, py + 6, pw - lw - 6, ph - 12, 10, fill);
    ctx.fillStyle = onColor(fill);
    fitFont(ctx, price, pw - lw - 26, 26, 14, 900);
    ctx.textAlign = "center";
    ctx.fillText(price, x + lw + (pw - lw - 6) / 2, py + 37);
    ctx.textAlign = "left";
  };
  const priceA = d.content.priceText || formatLakh(v.price);
  const priceB = cmp ? (cmp.priceOnRequest ? "On request" : `${formatLakh(cmp.price)}${cmp.condition === "new" ? "*" : ""}`) : "—";
  pill(PAD, (v.variant || v.fuel || "Variant").toUpperCase(), priceA, d.colors.accent);
  pill(PAD + pw + 30, (cmp?.variant || cmp?.fuel || "Variant").toUpperCase(), priceB, "#dc2626");

  const tableTop = top + bandH + 30;
  const rowH = 46;
  const maxRows = Math.max(3, Math.floor((bottom - 40 - tableTop - rowH) / rowH));
  const rows = cmp ? comparisonRows(v, cmp, maxRows) : [];
  const c1 = (W - PAD * 2) * 0.36;
  const c2 = (W - PAD * 2 - c1) / 2;
  const tw = W - PAD * 2;
  strokeRound(ctx, PAD, tableTop, tw, rowH * (rows.length + 1), 14, LINE, 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, tableTop, tw, rowH);
  ctx.clip();
  fillRound(ctx, PAD, tableTop, tw, rowH + 14, 14, "#1e293b");
  ctx.fillStyle = d.colors.primary;
  ctx.fillRect(PAD + c1, tableTop, c2, rowH);
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(PAD + c1 + c2, tableTop, c2, rowH);
  ctx.restore();
  font(ctx, 19, 800);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Category", PAD + 18, tableTop + 30);
  ctx.textAlign = "center";
  fitFont(ctx, `${v.model} ${v.variant}`.trim(), c2 - 16, 19, 12, 800);
  ctx.fillText(`${v.model} ${v.variant}`.trim(), PAD + c1 + c2 / 2, tableTop + 30);
  const bLabel = cmp ? `${cmp.model} ${cmp.variant}`.trim() : "Compare";
  fitFont(ctx, bLabel, c2 - 16, 19, 12, 800);
  ctx.fillText(bLabel, PAD + c1 + c2 * 1.5, tableTop + 30);
  ctx.textAlign = "left";

  if (!cmp) {
    font(ctx, 22, 600);
    ctx.fillStyle = MUTED;
    ctx.textAlign = "center";
    ctx.fillText("Pick a second car in the studio to fill this table", W / 2, tableTop + rowH + 36);
    ctx.textAlign = "left";
  }
  rows.forEach((row, i) => {
    const y = tableTop + rowH * (i + 1);
    if (i % 2 === 0) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(PAD + 1, y, tw - 2, rowH);
    }
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(PAD + tw, y);
    ctx.moveTo(PAD + c1, y);
    ctx.lineTo(PAD + c1, y + rowH);
    ctx.moveTo(PAD + c1 + c2, y);
    ctx.lineTo(PAD + c1 + c2, y + rowH);
    ctx.stroke();
    ctx.fillStyle = INK;
    fitFont(ctx, row.label, c1 - 30, 18, 12, 600);
    ctx.fillText(row.label, PAD + 18, y + 29);
    const cell = (val: string, cx: number) => {
      if (row.kind === "check") {
        if (val === "yes") checkIcon(ctx, cx, y + rowH / 2, 26, "#16a34a");
        else crossIcon(ctx, cx, y + rowH / 2, 24, "#dc2626");
        return;
      }
      ctx.fillStyle = INK;
      fitFont(ctx, val, c2 - 20, 18, 11, 600);
      ctx.textAlign = "center";
      ctx.fillText(val, cx, y + 29);
      ctx.textAlign = "left";
    };
    cell(row.a, PAD + c1 + c2 / 2);
    cell(row.b, PAD + c1 + c2 * 1.5);
  });

  drawDisclaimer(r, bottom);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 3. Used car sales card                                                */
/* ------------------------------------------------------------------ */

function usedSales(r: R) {
  const { ctx, W, H, d, v, a } = r;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;

  const ty = top + 24;
  const badgeR = d.content.offerBadge ? 74 : 0;
  const titleW = W - PAD * 2 - (badgeR ? badgeR * 2 + 20 : 0);
  ctx.fillStyle = INK;
  fitFont(ctx, d.content.headline, titleW, 56, 28, 900);
  ctx.fillText(d.content.headline, PAD, ty + 52);
  ctx.fillStyle = MUTED;
  fitFont(ctx, d.content.tagline, titleW, 24, 14, 600);
  ctx.fillText(d.content.tagline, PAD, ty + 90);
  if (badgeR) badgeBurst(ctx, W - PAD - badgeR, ty + 60, badgeR, d.colors.accent, d.content.offerBadge, onColor(d.colors.accent));

  const specs: [string, string][] = (
    [
      ["Year", String(v.year)],
      ["Variant", v.variant],
      ["Fuel", v.fuel],
      ["KMs Driven", v.kms > 0 ? `${v.kms.toLocaleString("en-IN")} km` : ""],
      ["Ownership", ownerLabel(v.owners)],
      ["Transmission", v.transmission],
      ["Registration", v.registration || v.state],
      ["Insurance", v.insuranceValid],
      ["Colour", v.color],
      ["Mileage", specValue(v, "mileage")],
    ] as [string, string][]
  ).filter(([, val]) => Boolean(val));

  const galleryAll = a.gallery.filter((g) => g.img);
  const tall = H >= 1300;
  const specCols = 4;
  const specRows = tall ? 2 : 1;
  const specShown = specs.slice(0, specCols * specRows);
  const specH = Math.ceil(specShown.length / specCols) * 78;
  const thumbs = galleryAll.slice(0, tall ? 6 : 4);
  const thumbH = H >= 1800 ? 150 : 110;
  const galleryH = thumbs.length >= 2 ? thumbH + 34 : 0;
  const badges = d.content.trustBadges.filter(Boolean).slice(0, 6);
  const badgesH = badges.length && tall ? Math.ceil(badges.length / 3) * 52 : 0;

  const heroTop = ty + 116;
  const used = specH + 22 + (galleryH ? galleryH + 18 : 0) + (badgesH ? badgesH + 14 : 0) + 20;
  const heroH = Math.max(240, bottom - heroTop - used);
  withShadow(ctx, 24, "rgba(15,23,42,0.18)", () => fillRound(ctx, PAD, heroTop, W - PAD * 2, heroH, 24, "#f1f5f9"));
  drawCover(ctx, a.hero, PAD, heroTop, W - PAD * 2, heroH, 24);
  watermark(r, PAD, heroTop, W - PAD * 2, heroH);

  const cardW = 340;
  const cardH = 120;
  const cx = W - PAD - cardW - 20;
  const cy = heroTop + heroH - cardH - 20;
  withShadow(ctx, 20, "rgba(0,0,0,0.3)", () => fillRound(ctx, cx, cy, cardW, cardH, 18, d.colors.primary));
  strokeRound(ctx, cx + 6, cy + 6, cardW - 12, cardH - 12, 14, hexToRgba("#ffffff", 0.35), 2);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  fitFont(ctx, d.content.priceText, cardW - 40, 54, 26, 900);
  ctx.fillText(d.content.priceText, cx + cardW / 2, cy + 66);
  font(ctx, 20, 600);
  ctx.fillText(d.content.priceNote, cx + cardW / 2, cy + 98);
  ctx.textAlign = "left";

  let y = heroTop + heroH + 22;
  const cellW = (W - PAD * 2) / specCols;
  specShown.forEach(([label, value], i) => {
    const col = i % specCols;
    const row = Math.floor(i / specCols);
    const x = PAD + col * cellW;
    const yy = y + row * 78;
    fillRound(ctx, x + 4, yy, cellW - 8, 70, 12, "#f8fafc");
    ctx.fillStyle = d.colors.primary;
    ctx.fillRect(x + 4, yy + 12, 4, 46);
    font(ctx, 15, 600);
    ctx.fillStyle = MUTED;
    ctx.fillText(label, x + 20, yy + 26);
    ctx.fillStyle = INK;
    fitFont(ctx, value, cellW - 36, 22, 13, 800);
    ctx.fillText(value, x + 20, yy + 54);
  });
  y += specH + 18;

  if (galleryH) {
    const n = thumbs.length;
    const gap = 12;
    const tw = (W - PAD * 2 - gap * (n - 1)) / n;
    thumbs.forEach((t, i) => {
      const x = PAD + i * (tw + gap);
      drawCover(ctx, t.img, x, y, tw, thumbH, 12);
      font(ctx, 15, 700);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      fitFont(ctx, t.label, tw - 6, 15, 11, 700);
      ctx.fillText(t.label, x + tw / 2, y + thumbH + 24);
      ctx.textAlign = "left";
    });
    y += galleryH + 18;
  }

  if (badgesH) {
    const bw = (W - PAD * 2) / 3;
    badges.forEach((b, i) => {
      const x = PAD + (i % 3) * bw;
      const yy = y + Math.floor(i / 3) * 52;
      strokeRound(ctx, x + 4, yy, bw - 8, 42, 21, hexToRgba(d.colors.primary, 0.35), 2);
      checkIcon(ctx, x + 28, yy + 21, 24, "#16a34a");
      font(ctx, 17, 700);
      ctx.fillStyle = INK;
      fitFont(ctx, b, bw - 64, 17, 11, 700);
      ctx.fillText(b, x + 48, yy + 27);
    });
  }

  drawDisclaimer(r, bottom);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 4. Finance & offer                                                    */
/* ------------------------------------------------------------------ */

function financeOffer(r: R) {
  const { ctx, W, H, d, v, a } = r;
  bgLight(r);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;
  const stacked = H / W > 1.5;
  const emi = emiFor(d.content, v.price);

  const benefits = d.content.trustBadges.filter(Boolean).slice(0, 5);
  const benefitsH = benefits.length ? 120 : 0;
  const contentBottom = bottom - benefitsH - 30;

  let heroRect: { x: number; y: number; w: number; h: number };
  let card: { x: number; y: number; w: number; h: number };
  const ty = top + 34;
  ctx.fillStyle = d.colors.primary;
  if (stacked) {
    font(ctx, 64, 900);
    const lines = wrapText(ctx, d.content.headline, W - PAD * 2, 2);
    drawLines(ctx, lines, PAD, ty + 60, 72);
    const hy = ty + 60 + lines.length * 72;
    const cardH = 520;
    heroRect = { x: PAD, y: hy, w: W - PAD * 2, h: Math.max(260, contentBottom - hy - cardH - 24) };
    card = { x: PAD, y: heroRect.y + heroRect.h + 24, w: W - PAD * 2, h: cardH };
  } else {
    const leftW = (W - PAD * 2) * 0.54;
    font(ctx, H >= 1300 ? 58 : 48, 900);
    const lines = wrapText(ctx, d.content.headline, leftW, 3);
    drawLines(ctx, lines, PAD, ty + 50, H >= 1300 ? 64 : 54);
    const hy = ty + 50 + lines.length * (H >= 1300 ? 64 : 54);
    heroRect = { x: PAD, y: hy, w: leftW, h: Math.max(220, contentBottom - hy) };
    card = { x: PAD + leftW + 24, y: ty, w: W - PAD * 2 - leftW - 24, h: contentBottom - ty };
  }
  drawCover(ctx, a.hero, heroRect.x, heroRect.y, heroRect.w, heroRect.h, 24);
  watermark(r, heroRect.x, heroRect.y, heroRect.w, heroRect.h);
  if (d.content.offerBadge) badgeBurst(ctx, heroRect.x + heroRect.w - 80, heroRect.y + 80, 70, "#dc2626", d.content.offerBadge);

  withShadow(ctx, 30, "rgba(15,23,42,0.18)", () => fillRound(ctx, card.x, card.y, card.w, card.h, 24, "#ffffff"));
  const ix = card.x + 28;
  const iw = card.w - 56;
  let y = card.y + 50;
  font(ctx, 18, 800);
  ctx.fillStyle = MUTED;
  ctx.fillText(v.brand.toUpperCase(), ix, y);
  y += 44;
  ctx.fillStyle = INK;
  fitFont(ctx, `${v.model} ${v.variant}`.trim(), iw, 38, 20, 900);
  ctx.fillText(`${v.model} ${v.variant}`.trim(), ix, y);
  y += 60;
  ctx.fillStyle = d.colors.primary;
  fitFont(ctx, d.content.priceText, iw, 54, 26, 900);
  ctx.fillText(d.content.priceText, ix, y);
  y += 30;
  font(ctx, 17, 600);
  ctx.fillStyle = MUTED;
  ctx.fillText(d.content.priceNote, ix, y);
  y += 26;

  const boxes: { label: string; value: string; sub?: string; fill: string; ink: string }[] = [];
  if (emi > 0) boxes.push({ label: "EMI Starts From", value: `${formatRupees(emi)}*/Month`, sub: `${d.content.tenureMonths} months @ ${d.content.interestRate}% (indicative)`, fill: shade(d.colors.primary, 0.88), ink: d.colors.primary });
  if (d.content.downPayment > 0) boxes.push({ label: "Low Down Payment", value: `${formatRupees(d.content.downPayment)}*`, fill: "#f8fafc", ink: INK });
  boxes.push({ label: "Offer", value: d.content.tagline || "Attractive Finance Offers Available", fill: shade(d.colors.accent, 0.8), ink: INK });
  const remaining = card.y + card.h - 24 - y;
  const boxH = Math.min(120, (remaining - (boxes.length - 1) * 14) / boxes.length);
  boxes.forEach((b) => {
    if (boxH < 60) return;
    fillRound(ctx, ix, y, iw, boxH, 16, b.fill);
    font(ctx, 17, 700);
    ctx.fillStyle = MUTED;
    ctx.fillText(b.label, ix + 20, y + 30);
    ctx.fillStyle = b.ink;
    if (b.label === "Offer") {
      font(ctx, 22, 800);
      const lines = wrapText(ctx, b.value, iw - 40, boxH > 100 ? 2 : 1);
      drawLines(ctx, lines, ix + 20, y + 62, 28);
    } else {
      fitFont(ctx, b.value, iw - 40, 40, 20, 900);
      ctx.fillText(b.value, ix + 20, y + 72);
      if (b.sub && boxH > 100) {
        font(ctx, 14, 500);
        ctx.fillStyle = MUTED;
        ctx.fillText(b.sub, ix + 20, y + 98);
      }
    }
    y += boxH + 14;
  });

  const cardBottom = card.y + card.h - 24;
  const highlights = d.content.features.filter(Boolean);
  if (highlights.length && cardBottom - y > 70) {
    y += 16;
    font(ctx, 17, 800);
    ctx.fillStyle = d.colors.primary;
    ctx.fillText("WHY YOU'LL LOVE IT", ix, y);
    y += 16;
    for (const h of highlights) {
      if (y + 38 > cardBottom) break;
      checkIcon(ctx, ix + 12, y + 18, 24, "#16a34a");
      ctx.fillStyle = INK;
      fitFont(ctx, h, iw - 36, 19, 12, 700);
      ctx.fillText(h, ix + 34, y + 25);
      y += 40;
    }
  }

  if (benefits.length) {
    const by = bottom - benefitsH - 14;
    const bw = (W - PAD * 2) / benefits.length;
    benefits.forEach((b, i) => {
      const cx = PAD + bw * i + bw / 2;
      ctx.beginPath();
      ctx.arc(cx, by + 34, 30, 0, Math.PI * 2);
      ctx.fillStyle = d.colors.primary;
      ctx.fill();
      checkIcon(ctx, cx, by + 34, 34, d.colors.primary);
      font(ctx, 17, 700);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      fitFont(ctx, b, bw - 12, 17, 11, 700);
      ctx.fillText(b, cx, by + 92);
      ctx.textAlign = "left";
    });
  }

  drawDisclaimer(r, bottom);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 5. Social media post                                                  */
/* ------------------------------------------------------------------ */

function socialPost(r: R) {
  const { ctx, W, H, d, a } = r;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;
  const chips = d.content.features.filter(Boolean).slice(0, 3);
  const chipsH = chips.length ? 86 : 0;
  const heroH = bottom - top - chipsH;
  drawCover(ctx, a.hero, 0, top, W, heroH, 0, shade(d.colors.primary, 0.85));
  watermark(r, 0, top, W, heroH);
  const g = ctx.createLinearGradient(0, top + heroH * 0.45, 0, top + heroH);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, hexToRgba(d.colors.dark, 0.92));
  ctx.fillStyle = g;
  ctx.fillRect(0, top + heroH * 0.45, W, heroH * 0.55);

  font(ctx, 40, 900);
  const pw = Math.min(W - PAD * 2, ctx.measureText(d.content.priceText).width + 60);
  fillRound(ctx, PAD, top + 30, pw, 76, 18, d.colors.accent);
  ctx.fillStyle = onColor(d.colors.accent);
  ctx.fillText(d.content.priceText, PAD + 30, top + 82);

  ctx.fillStyle = "#ffffff";
  fitFont(ctx, d.content.headline, W - PAD * 2, 68, 30, 900);
  ctx.fillText(d.content.headline, PAD, top + heroH - 86);
  font(ctx, 26, 600);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const tl = wrapText(ctx, d.content.tagline, W - PAD * 2, 1);
  drawLines(ctx, tl, PAD, top + heroH - 40, 30);

  if (chips.length) {
    const cy = top + heroH + 18;
    const cw = (W - PAD * 2 - 16 * (chips.length - 1)) / chips.length;
    chips.forEach((c, i) => {
      const x = PAD + i * (cw + 16);
      fillRound(ctx, x, cy, cw, 52, 26, shade(d.colors.primary, 0.9));
      checkIcon(ctx, x + 28, cy + 26, 26, d.colors.primary);
      ctx.fillStyle = INK;
      fitFont(ctx, c, cw - 64, 19, 12, 700);
      ctx.fillText(c, x + 50, cy + 33);
    });
  }
  drawDisclaimer(r, top + heroH - 4, true);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 6. Specification sheet                                                */
/* ------------------------------------------------------------------ */

function specification(r: R) {
  const { ctx, W, H, d, v, a } = r;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;

  const ty = top + 30;
  ctx.fillStyle = INK;
  fitFont(ctx, d.content.headline, W * 0.6, 52, 26, 900);
  ctx.fillText(d.content.headline, PAD, ty + 46);
  font(ctx, 22, 600);
  ctx.fillStyle = MUTED;
  ctx.fillText(wrapText(ctx, d.content.tagline, W * 0.6, 1)[0] ?? "", PAD, ty + 82);
  ctx.textAlign = "right";
  ctx.fillStyle = d.colors.primary;
  fitFont(ctx, d.content.priceText, W * 0.34, 44, 22, 900);
  ctx.fillText(d.content.priceText, W - PAD, ty + 46);
  font(ctx, 17, 600);
  ctx.fillStyle = MUTED;
  ctx.fillText(d.content.priceNote, W - PAD, ty + 78);
  ctx.textAlign = "left";

  const specs = v.specs.length ? v.specs : [{ key: "fuel", label: "Fuel", value: v.fuel }];
  const features = d.content.features.filter(Boolean);
  const rowH = 44;
  const specRows = Math.ceil(specs.length / 2);
  const featRows = Math.ceil(features.length / 2);
  const heroTop = ty + 108;
  const maxTables = bottom - heroTop - 280;
  const specRowsShown = Math.max(1, Math.min(specRows, Math.floor((maxTables * 0.6) / rowH)));
  const featRowsShown = Math.max(0, Math.min(featRows, Math.floor((maxTables - specRowsShown * rowH - 60) / 40)));
  const tablesH = specRowsShown * rowH + 50 + (featRowsShown ? featRowsShown * 40 + 56 : 0);
  const heroH = Math.max(240, bottom - heroTop - tablesH - 30);
  drawCover(ctx, a.hero, PAD, heroTop, W - PAD * 2, heroH, 24, shade(d.colors.primary, 0.92));
  watermark(r, PAD, heroTop, W - PAD * 2, heroH);

  let y = heroTop + heroH + 30;
  font(ctx, 22, 900);
  ctx.fillStyle = d.colors.primary;
  ctx.fillText("SPECIFICATIONS", PAD, y + 4);
  y += 20;
  const colW = (W - PAD * 2 - 20) / 2;
  specs.slice(0, specRowsShown * 2).forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (colW + 20);
    const yy = y + row * rowH;
    if (row % 2 === 0) fillRound(ctx, x, yy, colW, rowH - 4, 8, "#f8fafc");
    font(ctx, 17, 600);
    ctx.fillStyle = MUTED;
    ctx.fillText(s.label, x + 14, yy + 27);
    ctx.fillStyle = INK;
    ctx.textAlign = "right";
    fitFont(ctx, s.value, colW * 0.55, 18, 12, 800);
    ctx.fillText(s.value, x + colW - 14, yy + 27);
    ctx.textAlign = "left";
  });
  y += specRowsShown * rowH + 26;
  if (featRowsShown) {
    font(ctx, 22, 900);
    ctx.fillStyle = d.colors.primary;
    ctx.fillText("KEY FEATURES", PAD, y + 4);
    y += 22;
    features.slice(0, featRowsShown * 2).forEach((f, i) => {
      const x = PAD + (i % 2) * (colW + 20);
      const yy = y + Math.floor(i / 2) * 40;
      checkIcon(ctx, x + 14, yy + 18, 24, "#16a34a");
      ctx.fillStyle = INK;
      fitFont(ctx, f, colW - 44, 18, 12, 600);
      ctx.fillText(f, x + 36, yy + 25);
    });
  }
  drawDisclaimer(r, bottom);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 7. Lifestyle                                                          */
/* ------------------------------------------------------------------ */

function lifestyle(r: R) {
  const { ctx, W, H, d, v, a } = r;
  const fh = footerHeight(r);
  const bottom = H - fh;
  drawCover(ctx, a.hero, 0, 0, W, bottom, 0, shade(d.colors.primary, -0.2));
  watermark(r, 0, 0, W, bottom);
  const gTop = ctx.createLinearGradient(0, 0, 0, 260);
  gTop.addColorStop(0, hexToRgba(d.colors.dark, 0.85));
  gTop.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gTop;
  ctx.fillRect(0, 0, W, 260);
  const gBot = ctx.createLinearGradient(0, bottom * 0.45, 0, bottom);
  gBot.addColorStop(0, "rgba(0,0,0,0)");
  gBot.addColorStop(1, hexToRgba(d.colors.dark, 0.95));
  ctx.fillStyle = gBot;
  ctx.fillRect(0, bottom * 0.45, W, bottom * 0.55);
  drawHeader(r, true);

  ctx.fillStyle = "#ffffff";
  font(ctx, H >= 1800 ? 86 : 70, 900);
  const lines = wrapText(ctx, d.content.headline, W - PAD * 2, 3);
  const lh = H >= 1800 ? 94 : 78;
  const blockTop = bottom - 130 - 100 - lines.length * lh;
  drawLines(ctx, lines, PAD, blockTop + lh, lh);
  ctx.fillStyle = d.colors.accent;
  fitFont(ctx, `${vehicleName(v)} ${v.variant}`.trim(), W - PAD * 2, 36, 20, 800);
  ctx.fillText(`${vehicleName(v)} ${v.variant}`.trim(), PAD, blockTop + lines.length * lh + 50);
  font(ctx, 24, 600);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(wrapText(ctx, d.content.tagline, W - PAD * 2, 1)[0] ?? "", PAD, blockTop + lines.length * lh + 92);
  font(ctx, 36, 900);
  const pw = ctx.measureText(d.content.priceText).width + 56;
  fillRound(ctx, PAD, bottom - 106, pw, 66, 33, "#ffffff");
  ctx.fillStyle = d.colors.primary;
  ctx.fillText(d.content.priceText, PAD + 28, bottom - 60);
  drawDisclaimer(r, bottom, true);
  drawFooter(r);
}

/* ------------------------------------------------------------------ */
/* 8. Custom                                                             */
/* ------------------------------------------------------------------ */

function custom(r: R) {
  const { ctx, W, H, d, a } = r;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const top = drawHeader(r);
  const fh = footerHeight(r);
  const bottom = H - fh;
  const bandH = (bottom - top) * 0.42;
  const g = ctx.createLinearGradient(0, top, W, top + bandH);
  g.addColorStop(0, d.colors.primary);
  g.addColorStop(1, shade(d.colors.primary, -0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, bandH);

  ctx.fillStyle = "#ffffff";
  font(ctx, 58, 900);
  const lines = wrapText(ctx, d.content.headline, W - PAD * 2, 2);
  drawLines(ctx, lines, PAD, top + 80, 66);
  font(ctx, 24, 600);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  drawLines(ctx, wrapText(ctx, d.content.tagline, W - PAD * 2, 2), PAD, top + 80 + lines.length * 66 + 4, 32);

  const bullets = d.content.bodyText
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const bulletsH = bullets.length * 50 + 30;
  const heroTop = top + bandH * 0.62;
  const heroH = Math.max(220, bottom - heroTop - bulletsH - 110);
  withShadow(ctx, 30, "rgba(15,23,42,0.25)", () => fillRound(ctx, PAD, heroTop, W - PAD * 2, heroH, 24, "#ffffff"));
  drawCover(ctx, a.hero, PAD, heroTop, W - PAD * 2, heroH, 24);
  watermark(r, PAD, heroTop, W - PAD * 2, heroH);

  let y = heroTop + heroH + 40;
  bullets.forEach((b) => {
    checkIcon(ctx, PAD + 16, y, 30, d.colors.primary);
    ctx.fillStyle = INK;
    fitFont(ctx, b, W - PAD * 2 - 50, 24, 14, 700);
    ctx.fillText(b, PAD + 44, y + 9);
    y += 50;
  });
  if (d.content.priceText) {
    ctx.fillStyle = d.colors.primary;
    fitFont(ctx, d.content.priceText, W - PAD * 2, 48, 24, 900);
    ctx.fillText(d.content.priceText, PAD, bottom - 40);
    font(ctx, 18, 600);
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.fillText(d.content.priceNote, W - PAD, bottom - 44);
    ctx.textAlign = "left";
  }
  drawFooter(r);
}

const RENDERERS = {
  feature_highlights: featureHighlights,
  comparison,
  used_sales: usedSales,
  finance_offer: financeOffer,
  social_post: socialPost,
  specification,
  lifestyle,
  custom,
} as const;

export function renderPoster(
  canvas: HTMLCanvasElement,
  design: BrochureDesign,
  vehicle: BrochureVehicle,
  compare: BrochureVehicle | null,
  assets: PosterAssets
) {
  const { width: W, height: H } = POSTER_SIZES[design.size];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  ctx.imageSmoothingQuality = "high";
  RENDERERS[design.template]({ ctx, W, H, d: design, v: vehicle, cmp: compare, a: assets });
}

export function galleryLabel(v: BrochureVehicle, url: string, index: number): string {
  const angle = v.angles[url];
  return angle ? photoAngleLabel(angle) : `Photo ${index + 1}`;
}

export type Ctx = CanvasRenderingContext2D;

const FAMILY = '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif';

export function font(ctx: Ctx, size: number, weight = 400, italic = false) {
  ctx.font = `${italic ? "italic " : ""}${weight} ${Math.round(size)}px ${FAMILY}`;
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function fillRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lineWidth = 2) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function withShadow(ctx: Ctx, blur: number, color: string, draw: () => void, offsetY = 6) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  draw();
  ctx.restore();
}

/** Draw an image cropped to fill the box (CSS object-fit: cover). */
export function drawCover(
  ctx: Ctx,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
  placeholder = "#e2e8f0"
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  if (!img || !img.naturalWidth) {
    ctx.fillStyle = placeholder;
    ctx.fillRect(x, y, w, h);
    font(ctx, Math.max(14, Math.min(26, w / 12)), 600);
    ctx.fillStyle = "rgba(15,23,42,0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add photo", x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.restore();
    return;
  }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** Draw an image fully inside the box (object-fit: contain). Returns the drawn rect. */
export function drawContain(
  ctx: Ctx,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  align: "left" | "center" | "right" = "center"
) {
  if (!img || !img.naturalWidth) return { x, y, w: 0, h: 0 };
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = align === "left" ? x : align === "right" ? x + w - dw : x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return { x: dx, y: dy, w: dw, h: dh };
}

/** Pick the largest font size (≤ size) that fits text on one line. */
export function fitFont(ctx: Ctx, text: string, maxW: number, size: number, min: number, weight = 700, italic = false) {
  let s = size;
  font(ctx, s, weight, italic);
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 2;
    font(ctx, s, weight, italic);
  }
  return s;
}

/** Word-wrap into at most `maxLines`, ellipsising the last line. */
export function wrapText(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(test).width <= maxW || !line) {
      line = test;
      continue;
    }
    lines.push(line);
    line = words[i]!;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const used = lines.join(" ").split(" ").length;
    if (used < words.length) {
      let last = lines[maxLines - 1]!;
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

export function drawLines(ctx: Ctx, lines: string[], x: number, y: number, lineH: number) {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length * lineH;
}

export function hexToRgba(hex: string, alpha: number) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return `rgba(11,42,91,${alpha})`;
  return `rgba(${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)},${alpha})`;
}

export function shade(hex: string, amount: number) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const mix = (c: string) => {
    const v = parseInt(c, 16);
    const out = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.round(Math.max(0, Math.min(255, out))).toString(16).padStart(2, "0");
  };
  return `#${mix(m[1]!)}${mix(m[2]!)}${mix(m[3]!)}`;
}

/** Readable text colour on a given background. */
export function onColor(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "#ffffff";
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c!, 16)) as [number, number, number];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#0f172a" : "#ffffff";
}

export function checkIcon(ctx: Ctx, cx: number, cy: number, size: number, color: string, filled = true) {
  ctx.save();
  if (filled) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = filled ? "#ffffff" : color;
  ctx.lineWidth = Math.max(2, size / 7);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.05, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.24, cy - size * 0.16);
  ctx.stroke();
  ctx.restore();
}

export function crossIcon(ctx: Ctx, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size / 6);
  ctx.lineCap = "round";
  const d = size * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d);
  ctx.lineTo(cx - d, cy + d);
  ctx.stroke();
  ctx.restore();
}

export function pinIcon(ctx: Ctx, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  const r = size * 0.32;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.12, r, Math.PI, 0);
  ctx.lineTo(cx, cy + size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.12, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/** Phone handset inside a filled circle. */
export function phoneIcon(ctx: Ctx, cx: number, cy: number, size: number, color: string) {
  const R = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  const hx = cx + R * 0.12;
  const hy = cy - R * 0.12;
  const r = R * 0.5;
  const a0 = Math.PI * 0.55;
  const a1 = Math.PI * 1.45;
  ctx.strokeStyle = onColor(color);
  ctx.fillStyle = onColor(color);
  ctx.lineWidth = R * 0.24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(hx, hy, r, a0, a1);
  ctx.stroke();
  for (const a of [a0, a1]) {
    ctx.beginPath();
    ctx.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r, R * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Star-burst sticker (e.g. CERTIFIED / SPECIAL OFFER). */
export function badgeBurst(ctx: Ctx, cx: number, cy: number, r: number, fill: string, text: string, textColor = "#ffffff") {
  ctx.save();
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.86;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba("#ffffff", 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = text.toUpperCase().split(/\s+/).slice(0, 3);
  const size = Math.min(r * 0.42, (r * 1.3) / Math.max(...words.map((w) => w.length), 1) * 1.7);
  font(ctx, size, 800);
  words.forEach((w, i) => ctx.fillText(w, cx, cy + (i - (words.length - 1) / 2) * size * 1.08));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

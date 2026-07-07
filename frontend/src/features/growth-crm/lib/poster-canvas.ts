import type { PosterCanvasData, PosterTemplateDef } from "@/features/growth-crm/config/poster-templates";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = words[i] + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, cy);
}

/** Template-driven poster render (no external editor). */
export async function renderPosterToCanvas(
  canvas: HTMLCanvasElement,
  template: PosterTemplateDef,
  data: PosterCanvasData
) {
  const w = template.width;
  const h = template.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, template.accent);
  grad.addColorStop(1, template.accentSecondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(40, 40, w - 80, h - 80);

  if (data.logoUrl) {
    try {
      const logo = await loadImage(data.logoUrl);
      const lw = 160;
      const lh = (logo.height / logo.width) * lw;
      ctx.drawImage(logo, 72, 72, lw, Math.min(lh, 120));
    } catch {
      /* skip broken logo */
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.fillText(data.offerTitle.slice(0, 48), 72, 220);

  const vehicleY = 280;
  const vehicleH = 520;
  if (data.vehicleImageUrl) {
    try {
      const veh = await loadImage(data.vehicleImageUrl);
      const aspect = veh.width / veh.height;
      let dw = w - 144;
      let dh = dw / aspect;
      if (dh > vehicleH) {
        dh = vehicleH;
        dw = dh * aspect;
      }
      const dx = (w - dw) / 2;
      ctx.drawImage(veh, dx, vehicleY, dw, dh);
    } catch {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(72, vehicleY, w - 144, vehicleH);
      ctx.fillStyle = "#fff";
      ctx.font = "24px system-ui";
      ctx.fillText("Vehicle image", w / 2 - 80, vehicleY + vehicleH / 2);
    }
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(72, vehicleY, w - 144, vehicleH);
  }

  const footerY = h - 280;
  ctx.fillStyle = "#ffffff";
  ctx.font = "28px system-ui";
  wrapText(ctx, data.offerDescription, 72, footerY, w - 144, 36);

  ctx.font = "bold 64px system-ui";
  ctx.fillText(data.price, 72, h - 160);

  ctx.fillStyle = template.accent;
  const ctaW = Math.min(400, ctx.measureText(data.cta).width + 80);
  const ctaX = w - ctaW - 72;
  const ctaY = h - 130;
  ctx.fillRect(ctaX, ctaY, ctaW, 72);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px system-ui";
  ctx.fillText(data.cta, ctaX + 40, ctaY + 48);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font="20px system-ui";
  ctx.fillText(template.name, 72, h - 48);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}

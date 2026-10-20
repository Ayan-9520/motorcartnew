export function canvasBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg" = "image/png", quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), type, quality);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadPdf(canvas: HTMLCanvasElement, filename: string) {
  const { jsPDF } = await import("jspdf");
  const w = canvas.width;
  const h = canvas.height;
  const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h], hotfixes: ["px_scaling"], compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, w, h, undefined, "FAST");
  pdf.save(filename);
}

/** Native share sheet with the poster file (mobile WhatsApp / Instagram / Facebook). */
export async function shareFile(blob: Blob, filename: string, title: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title, text });
    return true;
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError";
  }
}

export function posterFilename(title: string, ext: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "motorcart-poster";
  return `${base}.${ext}`;
}

import QRCode from "qrcode";
import { api } from "@/lib/api/axios";

const cache = new Map<string, Promise<HTMLImageElement | null>>();

function decode(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function isBundledAsset(url: string) {
  return /^\/(brand|media|demo|partners)\//.test(url) || /^(data|blob):/.test(url);
}

/** Load any listing photo without tainting the poster canvas (remote + /uploads go through the API proxy). */
export function loadPosterImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  const src = (url ?? "").trim();
  if (!src) return Promise.resolve(null);
  const hit = cache.get(src);
  if (hit) return hit;
  const job = (async () => {
    if (isBundledAsset(src)) return decode(src);
    try {
      const { data } = await api.get<Blob>("/api/brochure/image", { params: { url: src }, responseType: "blob", timeout: 20_000 });
      return decode(URL.createObjectURL(data));
    } catch {
      return null;
    }
  })();
  cache.set(src, job);
  void job.then((img) => {
    if (!img) cache.delete(src);
  });
  return job;
}

export async function qrImage(text: string, dark = "#0b1f4b"): Promise<HTMLImageElement | null> {
  try {
    const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark, light: "#ffffff" } });
    return decode(dataUrl);
  } catch {
    return null;
  }
}

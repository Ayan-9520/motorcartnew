import sharp from "sharp";

const MAX_EDGE = 2560;
/** High visual quality — dealer showroom photos should look HD on detail pages. */
const JPEG_QUALITY = 92;
const MAX_OUT_BYTES = 12 * 1024 * 1024;

export type NormalizedUpload = {
  buffer: Buffer;
  mime: string;
  ext: string;
};

function sniffMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // ISO BMFF (AVIF / HEIC): ....ftyp....
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis" || brand === "mif1") return "image/avif";
    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "mif1") return "image/heic";
  }
  if (buffer.length >= 6 && (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")) {
    return "image/gif";
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) return "image/bmp";
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Accept JPEG/PNG/WebP/AVIF/GIF/BMP/HEIC (when libvips supports it).
 * Pass through already-web formats unchanged when small enough; otherwise re-encode to HD JPEG.
 * Non-web formats are always converted to high-quality JPEG for universal browser display.
 */
export async function normalizeUploadImage(
  input: Buffer,
  declaredMime?: string,
): Promise<NormalizedUpload> {
  const sniffed = sniffMime(input);
  const mime = (declaredMime || sniffed || "").toLowerCase();

  if (mime === "application/pdf" || sniffed === "application/pdf") {
    return { buffer: input, mime: "application/pdf", ext: ".pdf" };
  }

  const passThrough =
    (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp" || mime === "image/jpg" || mime === "image/pjpeg") &&
    input.length <= MAX_OUT_BYTES;

  // Keep original JPEG/PNG/WebP bytes when already under cap (true HD, no re-compress)
  if (passThrough && sniffed && (sniffed === "image/jpeg" || sniffed === "image/png" || sniffed === "image/webp")) {
    const ext = sniffed === "image/png" ? ".png" : sniffed === "image/webp" ? ".webp" : ".jpg";
    return { buffer: input, mime: sniffed, ext };
  }

  try {
    let pipeline = sharp(input, { failOn: "none", animated: false }).rotate();
    const meta = await pipeline.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > MAX_EDGE || h > MAX_EDGE) {
      pipeline = pipeline.resize({
        width: w >= h ? MAX_EDGE : undefined,
        height: h > w ? MAX_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const buffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
    if (buffer.length > MAX_OUT_BYTES) {
      const tighter = await sharp(buffer)
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      return { buffer: tighter, mime: "image/jpeg", ext: ".jpg" };
    }
    return { buffer, mime: "image/jpeg", ext: ".jpg" };
  } catch {
    // If sharp cannot decode (rare HEIC), fall back only when bytes already sniff as web image
    if (sniffed === "image/jpeg" || sniffed === "image/png" || sniffed === "image/webp") {
      const ext = sniffed === "image/png" ? ".png" : sniffed === "image/webp" ? ".webp" : ".jpg";
      return { buffer: input, mime: sniffed, ext };
    }
    throw new Error(
      "Unsupported or corrupt image. Use JPG, PNG, WebP, AVIF, GIF, or BMP (max ~12MB).",
    );
  }
}

export function sniffUploadMime(buffer: Buffer): string | null {
  return sniffMime(buffer);
}

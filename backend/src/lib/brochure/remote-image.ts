import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export class RemoteImageError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIp(mapped[1]!) : false;
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new RemoteImageError("Only http(s) images are supported");
  if (url.username || url.password) throw new RemoteImageError("Credentials in URL are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new RemoteImageError("Host not allowed", 403);
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new RemoteImageError("Image host not found", 404);
  if (addrs.some((a) => isPrivateIp(a.address))) throw new RemoteImageError("Host not allowed", 403);
}

async function readLocalUpload(publicPath: string): Promise<Buffer> {
  const root = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const rel = decodeURIComponent(publicPath.replace(/^\/uploads\//, ""));
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep)) throw new RemoteImageError("Invalid path", 400);
  return readFile(full).catch(() => {
    throw new RemoteImageError("Image not found", 404);
  });
}

async function fetchRemote(raw: string): Promise<Buffer> {
  let current = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "MotorCart-BrochureStudio/1.0", Accept: "image/*" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) throw new RemoteImageError("Bad redirect", 502);
        current = new URL(next, current);
        continue;
      }
      if (!res.ok) throw new RemoteImageError(`Image request failed (${res.status})`, 502);
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (type && !type.startsWith("image/") && !type.startsWith("application/octet-stream")) {
        throw new RemoteImageError("URL is not an image", 415);
      }
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_BYTES) throw new RemoteImageError("Image too large", 413);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new RemoteImageError("Image too large", 413);
      return buf;
    } catch (e) {
      if (e instanceof RemoteImageError) throw e;
      throw new RemoteImageError("Could not download image", 502);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new RemoteImageError("Too many redirects", 502);
}

/** Load a listing photo (site `/uploads/…` or public http(s) URL) as a normalised JPEG/PNG buffer. */
export async function loadListingImage(
  url: string,
  opts: { maxEdge?: number; format?: "jpeg" | "png" } = {}
): Promise<{ buffer: Buffer; mime: string }> {
  const trimmed = url.trim();
  let raw: Buffer;
  if (trimmed.startsWith("/uploads/")) raw = await readLocalUpload(trimmed);
  else if (/^https?:\/\//i.test(trimmed)) raw = await fetchRemote(trimmed);
  else throw new RemoteImageError("Unsupported image URL");

  const maxEdge = opts.maxEdge ?? 2000;
  try {
    const source = sharp(raw, { failOn: "none" });
    const hasAlpha = opts.format ? opts.format === "png" : Boolean((await source.metadata()).hasAlpha);
    const pipeline = source.rotate().resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });
    if (hasAlpha) return { buffer: await pipeline.png().toBuffer(), mime: "image/png" };
    return { buffer: await pipeline.jpeg({ quality: 88 }).toBuffer(), mime: "image/jpeg" };
  } catch {
    throw new RemoteImageError("File is not a readable image", 415);
  }
}

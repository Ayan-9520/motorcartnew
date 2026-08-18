export type DetectedFormat =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "pdf"
  | "mp4"
  | "webm"
  | "unknown";

export function detectFileFormat(buffer: Buffer): DetectedFormat {
  if (buffer.length < 4) return "unknown";

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "pdf";
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "mp4";
  }

  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm";
  }

  return "unknown";
}

export function isAllowedFormat(format: DetectedFormat, allowed: readonly string[]): boolean {
  return format !== "unknown" && allowed.includes(format);
}

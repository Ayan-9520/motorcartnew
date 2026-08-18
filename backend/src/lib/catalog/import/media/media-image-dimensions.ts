import type { DetectedFormat } from "./media-file-type";

export type ImageDimensions = {
  width: number;
  height: number;
};

export function readImageDimensions(buffer: Buffer, format: DetectedFormat): ImageDimensions | null {
  switch (format) {
    case "png":
      return readPngDimensions(buffer);
    case "jpeg":
      return readJpegDimensions(buffer);
    case "gif":
      return readGifDimensions(buffer);
    case "webp":
      return readWebpDimensions(buffer);
    default:
      return null;
  }
}

function readPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return isPositive(width, height) ? { width, height } : null;
}

function readGifDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) return null;
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return isPositive(width, height) ? { width, height } : null;
}

function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return isPositive(width, height) ? { width, height } : null;
    }

    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 16) return null;
  const chunkStart = 12;
  const chunkType = buffer.subarray(chunkStart, chunkStart + 4).toString("ascii");

  if (chunkType === "VP8X" && buffer.length >= chunkStart + 10) {
    const width = 1 + buffer.readUIntLE(chunkStart + 8, 3);
    const height = 1 + buffer.readUIntLE(chunkStart + 11, 3);
    return isPositive(width, height) ? { width, height } : null;
  }

  if (chunkType === "VP8 " && buffer.length >= chunkStart + 10) {
    const width = buffer.readUInt16LE(chunkStart + 6) & 0x3fff;
    const height = buffer.readUInt16LE(chunkStart + 8) & 0x3fff;
    return isPositive(width, height) ? { width, height } : null;
  }

  return null;
}

function isPositive(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

export function validateImageDimensions(
  dims: ImageDimensions,
  limits: { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number },
): { valid: true } | { valid: false; errorCode: string; errorMessage: string } {
  if (dims.width < limits.minWidth || dims.height < limits.minHeight) {
    return {
      valid: false,
      errorCode: "IMAGE_TOO_SMALL",
      errorMessage: `Image dimensions ${dims.width}x${dims.height} below minimum ${limits.minWidth}x${limits.minHeight}`,
    };
  }
  if (dims.width > limits.maxWidth || dims.height > limits.maxHeight) {
    return {
      valid: false,
      errorCode: "IMAGE_TOO_LARGE",
      errorMessage: `Image dimensions ${dims.width}x${dims.height} exceed maximum ${limits.maxWidth}x${limits.maxHeight}`,
    };
  }
  return { valid: true };
}

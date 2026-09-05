import { createHash } from "node:crypto";

export function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

/** Non-destructive watermark: JPEG COM marker or PNG tEXt. Original buffer is not mutated. */
export function applyFileWatermark(buffer: Buffer, mime: string): Buffer {
  if (mime.includes("jpeg") || mime.includes("jpg")) return watermarkJpeg(buffer);
  if (mime.includes("png")) return watermarkPng(buffer);
  throw new Error("UNSUPPORTED_MEDIA");
}

function watermarkJpeg(buf: Buffer): Buffer {
  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("INVALID_JPEG");
  const comment = Buffer.from("MotorCart used-vehicle media", "utf8");
  const marker = Buffer.alloc(4 + comment.length);
  marker[0] = 0xff;
  marker[1] = 0xfe;
  marker.writeUInt16BE(comment.length + 2, 2);
  comment.copy(marker, 4);
  return Buffer.concat([buf.subarray(0, 2), marker, buf.subarray(2)]);
}

function watermarkPng(buf: Buffer): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.subarray(0, 8).compare(sig) !== 0) throw new Error("INVALID_PNG");
  let offset = 8;
  const len = buf.readUInt32BE(offset);
  const ihdrEnd = offset + 8 + len + 4;
  const keyword = "Comment";
  const text = "MotorCart used-vehicle media";
  const data = Buffer.concat([Buffer.from(keyword), Buffer.from([0]), Buffer.from(text)]);
  const chunkType = Buffer.from("tEXt");
  const crc = crc32(Buffer.concat([chunkType, data]));
  const chunk = Buffer.alloc(4 + 4 + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  chunkType.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc, 8 + data.length);
  return Buffer.concat([buf.subarray(0, ihdrEnd), chunk, buf.subarray(ihdrEnd)]);
}

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let b = 0; b < 8; b++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

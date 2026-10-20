/** Standard listing photo slots (Cars24 / Spinny style). Stored per URL in `vehicle.metadata.photoAngles`. */
export const PHOTO_ANGLES = [
  { id: "front", label: "Front View", short: "Front", required: true, excel: "Front Image URL" },
  { id: "side", label: "Side View", short: "Side", required: true, excel: "Side Image URL" },
  { id: "rear", label: "Rear View", short: "Rear", required: true, excel: "Rear Image URL" },
  { id: "interior", label: "Interior", short: "Interior", required: true, excel: "Interior Image URL" },
  { id: "dashboard", label: "Dashboard", short: "Dashboard", required: true, excel: "Dashboard Image URL" },
  { id: "odometer", label: "Odometer", short: "Odometer", required: false, usedOnly: true, excel: "Odometer Image URL" },
  { id: "engine", label: "Engine", short: "Engine", required: false, excel: "Engine Image URL" },
  { id: "tyres", label: "Tyres", short: "Tyres", required: false, excel: "Tyre Image URL" },
  { id: "boot", label: "Boot Space", short: "Boot", required: false, excel: "Boot Image URL" },
  { id: "rear_seat", label: "Rear Seats", short: "Rear seats", required: false, excel: "Rear Seat Image URL" },
] as const;

export type PhotoAngle = (typeof PHOTO_ANGLES)[number]["id"];
export type PhotoAngleMap = Record<string, PhotoAngle>;

const ANGLE_IDS = new Set<string>(PHOTO_ANGLES.map((a) => a.id));

export function isPhotoAngle(v: unknown): v is PhotoAngle {
  return typeof v === "string" && ANGLE_IDS.has(v);
}

export function photoAngleLabel(angle: PhotoAngle): string {
  return PHOTO_ANGLES.find((a) => a.id === angle)?.label ?? angle;
}

/** Read `metadata.photoAngles`, keeping only tags for URLs still in the gallery. */
export function readPhotoAngles(metadata: unknown, images: string[]): PhotoAngleMap {
  const raw = metadata && typeof metadata === "object" ? (metadata as { photoAngles?: unknown }).photoAngles : undefined;
  const out: PhotoAngleMap = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const allowed = new Set(images);
  for (const [url, angle] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.has(url) && isPhotoAngle(angle)) out[url] = angle;
  }
  return out;
}

/** Drop tags for removed photos and keep one photo per angle (latest assignment wins). */
export function cleanPhotoAngles(map: PhotoAngleMap, images: string[]): PhotoAngleMap {
  const allowed = new Set(images);
  const seen = new Set<PhotoAngle>();
  const out: PhotoAngleMap = {};
  for (const url of [...images].reverse()) {
    const angle = map[url];
    if (!angle || !allowed.has(url) || seen.has(angle)) continue;
    seen.add(angle);
    out[url] = angle;
  }
  return out;
}

/** Angle → URL lookup for poster/gallery layouts. */
export function imagesByAngle(images: string[], map: PhotoAngleMap): Partial<Record<PhotoAngle, string>> {
  const out: Partial<Record<PhotoAngle, string>> = {};
  for (const url of images) {
    const angle = map[url];
    if (angle && !out[angle]) out[angle] = url;
  }
  return out;
}

export function missingRequiredAngles(map: PhotoAngleMap, condition: "new" | "used"): PhotoAngle[] {
  const have = new Set(Object.values(map));
  return PHOTO_ANGLES.filter((a) => (a.required || ("usedOnly" in a && a.usedOnly && condition === "used")) && !have.has(a.id)).map(
    (a) => a.id
  );
}

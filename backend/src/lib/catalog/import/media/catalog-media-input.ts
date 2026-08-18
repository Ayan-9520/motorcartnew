import type { ImportRecord } from "../import-types";
import { importRecordToStandard } from "../import-record-normalizer";
import type { StandardCatalogImportRecord } from "../parser/parser-types";
import { parseMultiValueUrls } from "./media-url-validator";
import type { MediaInputItem } from "./media-types";

function pushUnique(items: MediaInputItem[], seen: Set<string>, item: MediaInputItem): void {
  const key = `${item.rowNumber}|${item.url}|${item.kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

export function extractMediaFromStandardRecord(
  record: StandardCatalogImportRecord & { videoUrl?: string | null; imageUrls?: string[] | null },
): MediaInputItem[] {
  const items: MediaInputItem[] = [];
  const seen = new Set<string>();
  const rowNumber = record.rowNumber;

  if (record.imageUrl?.trim()) {
    pushUnique(items, seen, { rowNumber, field: "imageUrl", kind: "image", url: record.imageUrl.trim() });
  }

  for (const url of record.imageUrls ?? []) {
    if (!url?.trim()) continue;
    pushUnique(items, seen, { rowNumber, field: "imageUrls", kind: "image", url: url.trim() });
  }

  if (record.brochureUrl?.trim()) {
    pushUnique(items, seen, { rowNumber, field: "brochureUrl", kind: "brochure", url: record.brochureUrl.trim() });
  }

  if (record.videoUrl?.trim()) {
    pushUnique(items, seen, { rowNumber, field: "videoUrl", kind: "video", url: record.videoUrl.trim() });
  }

  return items;
}

export function extractMediaFromImportRecord(record: ImportRecord): MediaInputItem[] {
  const standard = importRecordToStandard(record);
  const f = record.fields;

  const imageUrlsFromFields = [
    ...parseMultiValueUrls(f.imageUrls != null ? String(f.imageUrls) : null),
    ...parseMultiValueUrls(f.images != null ? String(f.images) : null),
    ...parseMultiValueUrls(f.gallery != null ? String(f.gallery) : null),
  ];

  const videoUrl =
    f.videoUrl != null
      ? String(f.videoUrl)
      : f.video_url != null
        ? String(f.video_url)
        : null;

  const base = standard ?? {
    rowNumber: record.rowNumber,
    segment: record.segment,
    brand: "",
    model: "",
    variant: "",
    fuel: "",
    transmission: "",
    year: NaN,
    bodyType: null,
    color: null,
    exShowroomPrice: null,
    onRoadPrice: null,
    city: null,
    state: null,
    imageUrl: f.imageUrl != null ? String(f.imageUrl) : null,
    brochureUrl: f.brochureUrl != null ? String(f.brochureUrl) : null,
    description: null,
    features: [],
  };

  return extractMediaFromStandardRecord({
    ...base,
    imageUrls: imageUrlsFromFields,
    videoUrl,
  });
}

export function extractMediaFromImportRecords(records: ImportRecord[]): MediaInputItem[] {
  return records.flatMap(extractMediaFromImportRecord);
}

export function extractMediaFromStandardRecords(
  records: Array<StandardCatalogImportRecord & { videoUrl?: string | null; imageUrls?: string[] | null }>,
): MediaInputItem[] {
  return records.flatMap(extractMediaFromStandardRecord);
}

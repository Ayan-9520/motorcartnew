import type { StandardCatalogField } from "./parser-types";

export type HeaderAliasRule = {
  field: StandardCatalogField;
  aliases: string[];
};

/** Configurable header alias map — matched case-insensitively after normalization. */
export const DEFAULT_HEADER_ALIASES: HeaderAliasRule[] = [
  {
    field: "brand",
    aliases: ["brand", "manufacturer", "oem", "make", "company", "brand name", "brandname"],
  },
  {
    field: "model",
    aliases: ["model", "model name", "modelname", "car model", "vehicle model"],
  },
  {
    field: "variant",
    aliases: ["variant", "trim", "version", "grade", "variant name", "variantname"],
  },
  {
    field: "fuel",
    aliases: ["fuel", "fuel type", "fueltype", "fuel_type"],
  },
  {
    field: "transmission",
    aliases: ["transmission", "gearbox", "gear box", "trans", "gear type"],
  },
  {
    field: "year",
    aliases: ["year", "model year", "modelyear", "model_year", "mfg year", "manufacturing year"],
  },
  {
    field: "bodyType",
    aliases: ["body type", "bodytype", "body_type", "body", "segment", "category"],
  },
  {
    field: "color",
    aliases: ["color", "colour", "exterior color", "exterior colour"],
  },
  {
    field: "exShowroomPrice",
    aliases: [
      "ex showroom price",
      "ex-showroom price",
      "exshowroom price",
      "ex_showroom_price",
      "ex showroom",
      "showroom price",
      "price",
    ],
  },
  {
    field: "onRoadPrice",
    aliases: ["on road price", "on-road price", "onroad price", "on_road_price", "on road", "orp"],
  },
  {
    field: "city",
    aliases: ["city", "location city", "town"],
  },
  {
    field: "state",
    aliases: ["state", "province", "region"],
  },
  {
    field: "imageUrl",
    aliases: ["image url", "image", "image_url", "photo url", "photo", "picture"],
  },
  {
    field: "brochureUrl",
    aliases: ["brochure url", "brochure", "brochure_url", "brochure link"],
  },
  {
    field: "description",
    aliases: ["description", "desc", "details", "notes"],
  },
  {
    field: "features",
    aliases: ["features", "feature list", "feature_list", "highlights"],
  },
];

export function normalizeHeaderLabel(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function buildHeaderLookup(rules: HeaderAliasRule[] = DEFAULT_HEADER_ALIASES): Map<string, StandardCatalogField> {
  const map = new Map<string, StandardCatalogField>();
  for (const rule of rules) {
    for (const alias of rule.aliases) {
      map.set(normalizeHeaderLabel(alias), rule.field);
    }
  }
  return map;
}

export function mapHeaders(
  headers: string[],
  rules: HeaderAliasRule[] = DEFAULT_HEADER_ALIASES,
): {
  columnMapping: Record<string, StandardCatalogField | null>;
  unknownColumns: string[];
  indexToField: Map<number, StandardCatalogField>;
} {
  const lookup = buildHeaderLookup(rules);
  const columnMapping: Record<string, StandardCatalogField | null> = {};
  const unknownColumns: string[] = [];
  const indexToField = new Map<number, StandardCatalogField>();
  const usedFields = new Set<StandardCatalogField>();

  headers.forEach((header, index) => {
    const trimmed = header.trim();
    if (!trimmed) {
      columnMapping[`__empty_${index}`] = null;
      return;
    }

    const normalized = normalizeHeaderLabel(trimmed);
    const field = lookup.get(normalized) ?? null;
    columnMapping[trimmed] = field;

    if (!field) {
      unknownColumns.push(trimmed);
      return;
    }

    if (!usedFields.has(field)) {
      usedFields.add(field);
      indexToField.set(index, field);
    }
  });

  return { columnMapping, unknownColumns, indexToField };
}

import { prisma } from "@/lib/prisma";
import { toSnakeRow } from "@/lib/db/table-map";

export type CompatibilitySearchParams = {
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  registration?: string;
  limit?: number;
};

export async function searchCompatibleParts(params: CompatibilitySearchParams) {
  const limit = Math.min(params.limit ?? 24, 50);
  let brand = params.brand?.trim();
  let model = params.model?.trim();
  let year = params.year;
  let fuelType = params.fuelType?.trim();

  if (params.registration) {
    const reg = params.registration.replace(/\s+/g, "").toUpperCase();
    const lookup = await prisma.partRegistrationLookup.findUnique({
      where: { registrationNumber: reg },
    });
    if (lookup) {
      brand = brand ?? lookup.brand ?? undefined;
      model = model ?? lookup.model ?? undefined;
      year = year ?? lookup.year ?? undefined;
      fuelType = fuelType ?? lookup.fuelType ?? undefined;
    }
  }

  if (!brand && !model) {
    return { rules: [], parts: [], partProducts: [], vehicle: { brand, model, year, fuelType } };
  }

  const brandKey = brand?.toLowerCase();
  const modelKey = model?.toLowerCase();

  const rules = await prisma.partCompatibilityRule.findMany({
    where: {
      ...(brandKey ? { brand: { contains: brandKey } } : {}),
      ...(modelKey ? { model: { contains: modelKey } } : {}),
      ...(year
        ? {
            OR: [
              { yearFrom: null, yearTo: null },
              { yearFrom: { lte: year }, yearTo: null },
              { yearFrom: null, yearTo: { gte: year } },
              { yearFrom: { lte: year }, yearTo: { gte: year } },
            ],
          }
        : {}),
      ...(fuelType ? { fuelType } : {}),
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const partIds = [...new Set(rules.map((r) => r.partId).filter(Boolean))] as string[];
  const productIds = [...new Set(rules.map((r) => r.partProductId).filter(Boolean))] as string[];

  const [parts, partProducts] = await Promise.all([
    partIds.length
      ? prisma.part.findMany({ where: { id: { in: partIds }, isActive: true }, take: limit })
      : [],
    productIds.length
      ? prisma.partProduct.findMany({
          where: { id: { in: productIds }, deletedAt: null },
          take: limit,
        })
      : [],
  ]);

  return {
    vehicle: { brand, model, year, fuelType },
    rules: rules.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)),
    parts: parts.map((p) => toSnakeRow(p as unknown as Record<string, unknown>)),
    partProducts: partProducts.map((p) =>
      toSnakeRow(p as unknown as Record<string, unknown>)
    ),
  };
}

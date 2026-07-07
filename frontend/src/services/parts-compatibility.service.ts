import { api } from "@/lib/api/axios";
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi } from "@/lib/api/base-url";

export type PartsCompatibilityResult = {
  vehicle: { brand?: string; model?: string; year?: number; fuelType?: string };
  rules: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  partProducts: Record<string, unknown>[];
};

export async function searchPartsCompatibility(params: {
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  registration?: string;
}): Promise<PartsCompatibilityResult | null> {
  if (!featureFlags.partsCompatibility || !hasConfiguredApi()) return null;

  try {
    const { data } = await api.get<PartsCompatibilityResult>("/api/parts/compatibility", {
      params: {
        brand: params.brand,
        model: params.model,
        year: params.year,
        fuel_type: params.fuelType,
        registration: params.registration,
      },
    });
    return data;
  } catch {
    return null;
  }
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/axios";
import type { InsuranceQuoteInput, InsuranceQuoteOffer, InsuranceVehicleType } from "../types";
import { POPULAR_BIKE_MODELS, POPULAR_CAR_MODELS } from "../lib/insurance-premium";

function defaultsForType(vehicleType: InsuranceVehicleType): InsuranceQuoteInput {
  const popular = vehicleType === "bike" ? POPULAR_BIKE_MODELS[0] : POPULAR_CAR_MODELS[0];
  return {
    vehicleType,
    vehicleYear: new Date().getFullYear() - 2,
    vehicleMake: popular.make,
    vehicleModel: popular.model,
    registrationCity: "Mumbai",
    fuelType: "petrol",
    ncbPercent: 20,
    planType: "comprehensive",
    addons: [],
  };
}

type StoredQuote = {
  id: string;
  partnerId?: string | null;
  premium?: number | string | null;
  quoteKind?: string;
};

export function useInsuranceQuote(vehicleType: InsuranceVehicleType = "car") {
  const [input, setInput] = useState<InsuranceQuoteInput>(() => defaultsForType(vehicleType));
  const [offers, setOffers] = useState<InsuranceQuoteOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setInput(defaultsForType(vehicleType));
  }, [vehicleType]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: StoredQuote[] }>("/api/insurance/quotes");
      const rows = (data.data ?? []).filter((q) => q.quoteKind === "PARTNER_QUOTE" || q.quoteKind === "BOUND");
      setOffers(
        rows.map((q) => ({
          id: q.id,
          partnerId: q.partnerId ?? "",
          partnerName: q.quoteKind === "BOUND" ? "Bound policy quote" : "Partner quote",
          partnerSlug: "",
          logoUrl: null,
          planType: input.planType,
          vehicleType: input.vehicleType,
          vehicleYear: input.vehicleYear,
          vehicleMake: input.vehicleMake,
          vehicleModel: input.vehicleModel,
          registrationCity: input.registrationCity,
          idvAmount: 0,
          annualPremium: Number(q.premium ?? 0),
          monthlyPremium: Math.round(Number(q.premium ?? 0) / 12),
          ncbPercent: input.ncbPercent,
          claimSettlementRatio: 0,
          rankScore: 0,
          approvalProbability: 0,
          breakdown: [],
          addons: input.addons,
          highlights: [q.quoteKind ?? "PARTNER_QUOTE"],
        }))
      );
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bestOffer = useMemo(() => offers[0] ?? null, [offers]);

  const patchInput = useCallback((patch: Partial<InsuranceQuoteInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  }, []);

  return { input, patchInput, offers, bestOffer, loading, refresh };
}

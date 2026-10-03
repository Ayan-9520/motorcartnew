import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeMarketQuotes,
  defaultMotorQuoteInput,
  normalizeMotorQuoteInput,
  type MotorQuoteInput,
  type MotorVehicleType,
  type PolicyScenario,
} from "../lib/insurance-engine";

const storeKey = (vehicleType: MotorVehicleType) => `mc.insurance.quote.v2.${vehicleType}`;
const SELECTED_KEY = "mc.insurance.selected.v2";

function readStored(vehicleType: MotorVehicleType): MotorQuoteInput | null {
  try {
    const raw = sessionStorage.getItem(storeKey(vehicleType));
    if (!raw) return null;
    const parsed = normalizeMotorQuoteInput(JSON.parse(raw) as Partial<MotorQuoteInput>);
    return parsed && parsed.vehicleType === vehicleType ? parsed : null;
  } catch {
    return null;
  }
}

function initialInput(vehicleType: MotorVehicleType, scenario?: PolicyScenario | null): MotorQuoteInput {
  const stored = readStored(vehicleType);
  if (stored && (!scenario || stored.scenario === scenario)) return stored;
  if (stored && scenario) return applyScenario(stored, scenario);
  return defaultMotorQuoteInput(vehicleType, scenario ?? "renew");
}

/** Switch scenario while keeping the vehicle; resets fields that do not apply. */
export function applyScenario(prev: MotorQuoteInput, scenario: PolicyScenario): MotorQuoteInput {
  if (prev.scenario === scenario) return prev;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return {
    ...prev,
    scenario,
    registrationMonth:
      scenario === "new" ? `${now.getFullYear()}-${month}` : prev.scenario === "new" ? `${now.getFullYear() - 3}-${month}` : prev.registrationMonth,
    previousPolicyStatus: scenario === "new" ? "none" : "active",
    currentNcb: scenario === "renew" ? prev.currentNcb || 20 : 0,
    claimInLastPolicy: false,
    transferredNcb: scenario === "renew" ? 0 : prev.transferredNcb,
    planType: scenario === "new" && prev.planType === "own_damage" ? "comprehensive" : prev.planType,
    hasActiveTp: false,
  };
}

export function useInsuranceQuote(vehicleType: MotorVehicleType = "car", scenario?: PolicyScenario | null) {
  const [input, setInput] = useState<MotorQuoteInput>(() => initialInput(vehicleType, scenario));

  useEffect(() => {
    setInput(initialInput(vehicleType, scenario));
  }, [vehicleType, scenario]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey(input.vehicleType), JSON.stringify(input));
    } catch {
      /* storage unavailable */
    }
  }, [input]);

  const { assessment, quotes } = useMemo(() => computeMarketQuotes(input), [input]);

  const patchInput = useCallback((patch: Partial<MotorQuoteInput>) => {
    setInput((prev) => {
      if (patch.scenario && patch.scenario !== prev.scenario) {
        const { scenario: s, ...rest } = patch;
        return { ...applyScenario(prev, s), ...rest };
      }
      return { ...prev, ...patch };
    });
  }, []);

  return { input, patchInput, setInput, assessment, offers: quotes, bestOffer: quotes[0] ?? null, loading: false };
}

/** Persist a quote input so the next page (quote / compare) opens prefilled. */
export function storeQuoteInput(input: MotorQuoteInput) {
  try {
    sessionStorage.setItem(storeKey(input.vehicleType), JSON.stringify(input));
  } catch {
    /* storage unavailable */
  }
}

export interface SelectedInsuranceQuote {
  insurerSlug: string;
  input: MotorQuoteInput;
}

export function saveSelectedQuote(sel: SelectedInsuranceQuote) {
  try {
    sessionStorage.setItem(SELECTED_KEY, JSON.stringify(sel));
    sessionStorage.setItem(storeKey(sel.input.vehicleType), JSON.stringify(sel.input));
  } catch {
    /* storage unavailable */
  }
}

export function readSelectedQuote(): SelectedInsuranceQuote | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { insurerSlug?: string; input?: Partial<MotorQuoteInput> };
    const input = normalizeMotorQuoteInput(parsed.input);
    if (!input || !parsed.insurerSlug) return null;
    return { insurerSlug: parsed.insurerSlug, input };
  } catch {
    return null;
  }
}

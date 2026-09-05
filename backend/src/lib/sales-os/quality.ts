import { INDIA_PIN_RE } from "@/lib/inventory/pin";
import { LEAD_QUALITIES, type LeadQuality } from "./constants";

export type QualitySignals = {
  hasVerifiedContact: boolean;
  hasVehicle: boolean;
  hasBudget: boolean;
  hasTimeline: boolean;
  financeRequired: boolean;
  exchangeRequired: boolean;
  hasValidPin: boolean;
  repeatedEnquiry: boolean;
  quotationExists: boolean;
  testDriveExists: boolean;
};

export function extractIndiaPin(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (INDIA_PIN_RE.test(text)) return text;
  const m = text.match(/\b([1-9][0-9]{5})\b/);
  return m ? m[1]! : null;
}

export function bandFromScore(score: number): LeadQuality {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  if (score >= 15) return "COLD";
  return "UNQUALIFIED";
}

export function calculateLeadQuality(signals: QualitySignals): {
  quality: LeadQuality;
  score: number;
  reason: string;
} {
  let score = 0;
  const parts: string[] = [];
  const add = (ok: boolean, pts: number, label: string) => {
    if (!ok) return;
    score += pts;
    parts.push(`${label}+${pts}`);
  };
  add(signals.hasVerifiedContact, 20, "contact");
  add(signals.hasVehicle, 15, "vehicle");
  add(signals.hasBudget, 10, "budget");
  add(signals.hasTimeline, 10, "timeline");
  add(signals.financeRequired, 10, "finance");
  add(signals.exchangeRequired, 5, "exchange");
  add(signals.hasValidPin, 10, "pin");
  add(signals.repeatedEnquiry, 15, "repeat");
  add(signals.quotationExists, 15, "quotation");
  add(signals.testDriveExists, 15, "test_drive");
  const quality = bandFromScore(score);
  return { quality, score, reason: parts.join(",") || "no_signals" };
}

export function isLeadQuality(value: string): value is LeadQuality {
  return (LEAD_QUALITIES as readonly string[]).includes(value);
}

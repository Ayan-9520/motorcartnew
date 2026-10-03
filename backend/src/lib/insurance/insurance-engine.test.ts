import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessScenario,
  computeIdv,
  computeInsurerQuote,
  computeMarketQuotes,
  defaultMotorQuoteInput,
  findInsurer,
  idvDepreciation,
  nextNcb,
  normalizeMotorQuoteInput,
  odTariffRate,
  tpBand,
  type MotorQuoteInput,
} from "./insurance-engine";

const asOf = new Date("2026-10-03T00:00:00Z");

function car(overrides: Partial<MotorQuoteInput> = {}): MotorQuoteInput {
  return { ...defaultMotorQuoteInput("car", "renew"), registrationMonth: "2023-10", ...overrides };
}

describe("motor insurance engine", () => {
  it("uses IRDAI TP bands", () => {
    assert.equal(tpBand("car", "petrol", 1197).annual, 3416);
    assert.equal(tpBand("car", "petrol", 998).annual, 2094);
    assert.equal(tpBand("car", "diesel", 2198).longTerm, 24596);
    assert.equal(tpBand("bike", "petrol", 149).longTerm, 3851);
    assert.equal(tpBand("bike", "electric", 3).annual, 457);
    assert.equal(tpBand("car", "electric", 45).annual, 2904);
  });

  it("applies IDV depreciation slabs", () => {
    assert.equal(idvDepreciation(3), 0.05);
    assert.equal(idvDepreciation(30), 0.3);
    assert.equal(idvDepreciation(59), 0.5);
    assert.equal(idvDepreciation(200), 0.85);
    const idv = computeIdv(1000000, 36);
    assert.equal(idv.idv, 600000);
    assert.equal(idv.min, 540000);
    assert.equal(idv.max, 660000);
  });

  it("picks tariff OD by zone and age", () => {
    assert.equal(odTariffRate("car", "petrol", 1197, "Mumbai", 2), 3.283);
    assert.equal(odTariffRate("car", "petrol", 1197, "Jaipur", 7), 3.351);
    assert.equal(odTariffRate("bike", "petrol", 349, "Pune", 12), 1.928);
  });

  it("steps NCB on a claim-free renewal and resets after a claim or 90-day lapse", () => {
    assert.equal(nextNcb(0), 20);
    assert.equal(nextNcb(45), 50);
    assert.equal(nextNcb(50), 50);
    assert.equal(assessScenario(car({ currentNcb: 25 }), asOf).ncbPercent, 35);
    assert.equal(assessScenario(car({ currentNcb: 25, claimInLastPolicy: true }), asOf).ncbPercent, 0);
    const lapsed = assessScenario(car({ currentNcb: 35, previousPolicyStatus: "expired_over_90" }), asOf);
    assert.equal(lapsed.ncbPercent, 0);
    assert.equal(lapsed.inspectionRequired, true);
    const shortLapse = assessScenario(car({ currentNcb: 35, previousPolicyStatus: "expired_under_90" }), asOf);
    assert.equal(shortLapse.ncbPercent, 45);
    assert.equal(shortLapse.inspectionRequired, true);
  });

  it("new vehicle: long-term TP, 5% IDV depreciation, transferred NCB", () => {
    const input = { ...defaultMotorQuoteInput("car", "new"), transferredNcb: 25, exShowroom: 800000, capacity: 1199 };
    const a = assessScenario(input, asOf);
    assert.equal(a.tpTermYears, 3);
    assert.equal(a.ncbPercent, 25);
    const q = computeInsurerQuote(input, findInsurer("acko")!, a);
    assert.equal(q.idv, 760000);
    assert.equal(q.tpPremium, 10640);
    assert.equal(q.tpTermYears, 3);
    assert.ok(q.ncbDiscount > 0);
  });

  it("used vehicle without active policy needs inspection; seller NCB does not transfer", () => {
    const input = car({ scenario: "used", previousPolicyStatus: "none", transferredNcb: 0 });
    const a = assessScenario(input, asOf);
    assert.equal(a.ncbPercent, 0);
    assert.equal(a.inspectionRequired, true);
    assert.ok(a.documents.some((d) => d.includes("Form 29")));
  });

  it("third party has no OD, no NCB, no add-ons; PA added unless waived", () => {
    const q = computeInsurerQuote(car({ planType: "third_party" }), findInsurer("hdfc-ergo")!);
    assert.equal(q.odNet, 0);
    assert.equal(q.addonTotal, 0);
    assert.equal(q.tpPremium, 3416);
    assert.equal(q.paCover, 375);
    assert.equal(q.totalPremium, Math.round((3416 + 375) * 1.18));
    const waived = computeInsurerQuote(car({ planType: "third_party", hasOtherPaCover: true }), findInsurer("hdfc-ergo")!);
    assert.equal(waived.paCover, 0);
  });

  it("standalone OD is gated by active TP", () => {
    const old = car({ planType: "own_damage", registrationMonth: "2019-01", hasActiveTp: false });
    assert.equal(computeMarketQuotes(old, asOf).quotes.length, 0);
    const young = car({ planType: "own_damage", registrationMonth: "2025-01" });
    const res = computeMarketQuotes(young, asOf);
    assert.ok(res.quotes.length > 0);
    assert.equal(res.quotes[0].tpPremium, 0);
  });

  it("drops ineligible add-ons (zero dep on old vehicles)", () => {
    const q = computeInsurerQuote(car({ registrationMonth: "2018-01", addons: ["zero_dep", "rsa"] }), findInsurer("acko")!);
    assert.deepEqual(
      q.addons.map((a) => a.key),
      ["rsa"],
    );
  });

  it("applies deductible and anti-theft caps", () => {
    const base = computeInsurerQuote(car({ addons: [] }), findInsurer("new-india")!);
    const disc = computeInsurerQuote(
      car({ addons: [], voluntaryDeductible: 15000, antiTheftDevice: true }),
      findInsurer("new-india")!,
    );
    assert.ok(disc.antiTheftDiscount <= 500);
    assert.ok(disc.voluntaryDeductibleDiscount <= 2500);
    assert.ok(disc.totalPremium < base.totalPremium);
  });

  it("sorts market quotes cheapest first and sanitises untrusted input", () => {
    const { quotes } = computeMarketQuotes(car(), asOf);
    assert.equal(quotes.length, 9);
    for (let i = 1; i < quotes.length; i++) assert.ok(quotes[i].totalPremium >= quotes[i - 1].totalPremium);
    assert.equal(normalizeMotorQuoteInput({ capacity: 0, exShowroom: 500000 }), null);
    const n = normalizeMotorQuoteInput({ capacity: 1200, exShowroom: 700000, addons: ["zero_dep", "hack" as never], currentNcb: 33 });
    assert.ok(n);
    assert.deepEqual(n!.addons, ["zero_dep"]);
    assert.equal(n!.currentNcb, 0);
  });
});

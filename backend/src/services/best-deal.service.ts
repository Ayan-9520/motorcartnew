import { prisma } from "@/lib/prisma";
import { CommosError } from "@/lib/commos/errors";
import { detectLanguage } from "@/lib/commos/crypto";
import { parseBudgetInr, scoreDeal, type DealCandidate } from "@/lib/commos/scoring";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";
import { isAvailableMarketplaceVehicle } from "@/lib/inventory/availability";
import type { CommActor } from "@/lib/commos/http";

const FORBIDDEN_CLAIMS = [
  "best price guaranteed",
  "loan approved",
  "insurance approved",
  "vehicle reserved",
];

function stripForbidden(text: string) {
  let out = text;
  for (const p of FORBIDDEN_CLAIMS) {
    out = out.replace(new RegExp(p, "ig"), "");
  }
  return out;
}

export async function recommendBestDeal(actor: CommActor, query: string, pincode?: string) {
  const lang = detectLanguage(query);
  const budgetMax = parseBudgetInr(query);
  const auto = /automatic|auto\b/i.test(query);
  const suv = /suv/i.test(query);
  const pin = pincode && /^\d{6}$/.test(pincode) ? pincode : undefined;

  let pinIds = new Set<string>();
  if (pin) {
    const stock = await getInventoryByPincode(pin);
    for (const item of stock.items) {
      if (item.vehicleId) pinIds.add(item.vehicleId);
    }
  }

  const baseWhere = {
    deletedAt: null as null,
    status: "available" as const,
    ...(suv ? { bodyType: { contains: "suv", mode: "insensitive" as const } } : {}),
  };
  const dealerInclude = { dealer: { select: { id: true, name: true, pincode: true } } } as const;

  // Always include PIN-local stock in the candidate pool (do not rely on unordered take:40 alone).
  const [pinVehicles, general] = await Promise.all([
    pin
      ? prisma.vehicle.findMany({
          where: {
            ...baseWhere,
            OR: [{ id: { in: [...pinIds] } }, { dealer: { pincode: pin } }],
          },
          take: 40,
          include: dealerInclude,
        })
      : Promise.resolve([]),
    prisma.vehicle.findMany({
      where: baseWhere,
      take: 40,
      include: dealerInclude,
    }),
  ]);

  const byId = new Map<string, (typeof general)[number]>();
  for (const v of [...pinVehicles, ...general]) byId.set(v.id, v);
  const vehicles = [...byId.values()];

  const ranked = vehicles
    .filter((v) => isAvailableMarketplaceVehicle(v.status, v.deletedAt))
    .map((v) => {
      const pinMatch = pin ? pinIds.has(v.id) || v.dealer?.pincode === pin : false;
      const c: DealCandidate = {
        vehicleId: v.id,
        title: v.title,
        brand: v.brand,
        model: v.model,
        price: v.price != null ? Number(v.price) : null,
        transmission: v.transmission,
        fuelType: v.fuelType,
        city: v.city,
        dealerId: v.dealerId,
        dealerName: v.dealer?.name ?? null,
        pincode: v.dealer?.pincode,
        stockStatus: v.status === "available" ? "available" : "none",
        pinMatch,
      };
      const { score, reasons } = scoreDeal(c, {
        budgetMax,
        transmission: auto ? "automatic" : undefined,
        categoryHint: suv ? "suv" : undefined,
      });
      return {
        vehicleId: v.id,
        title: v.title,
        variant: v.variant,
        brand: v.brand,
        model: v.model,
        price: c.price,
        stockStatus: c.stockStatus,
        catalogOnly: false,
        dealer: v.dealer ? { id: v.dealer.id, name: v.dealer.name } : null,
        pincode: v.dealer?.pincode ?? null,
        pinMatch,
        score,
        why: reasons,
        finance: { indicative: true, approved: false },
        insurance: { quoteInvented: false },
        claims: { priceGuaranteed: false, loanApproved: false, reserved: false },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const explanation =
    lang === "hi-IN"
      ? "Yeh ranking inventory, budget aur PIN stock par based hai. Loan/insurance approved nahi hai."
      : "Ranking uses real inventory, budget match and PIN stock. No loan or insurance approval is implied.";

  return {
    language: lang,
    query,
    labeledAi: true,
    explanation: stripForbidden(explanation),
    items: ranked,
    sourceOfTruth: "deterministic_scoring",
  };
}

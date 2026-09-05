import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { handlePartnerOsError, partnerActorFrom, readJson } from "@/lib/partneros/http";
import { listFinanceProducts, upsertFinanceProduct } from "@/services/partner-industry.service";

export async function GET(req: NextRequest) {
  try {
    const data = await listFinanceProducts(partnerActorFrom(req));
    return ok({ data });
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const data = await upsertFinanceProduct(partnerActorFrom(req), {
      name: String(body.name ?? ""),
      loanType: String(body.loanType ?? "vehicle_loan"),
      minAmount: Number(body.minAmount ?? 0),
      maxAmount: Number(body.maxAmount ?? 0),
      tenureMinMonths: Number(body.tenureMinMonths ?? 12),
      tenureMaxMonths: Number(body.tenureMaxMonths ?? 84),
      rateMin: body.rateMin != null ? Number(body.rateMin) : undefined,
      rateMax: body.rateMax != null ? Number(body.rateMax) : undefined,
      processingFee: typeof body.processingFee === "string" ? body.processingFee : undefined,
      vehicleCategory: typeof body.vehicleCategory === "string" ? body.vehicleCategory : undefined,
      bankId: typeof body.bankId === "string" ? body.bankId : undefined,
    });
    return ok({ data }, 201);
  } catch (e) {
    return handlePartnerOsError(e);
  }
}

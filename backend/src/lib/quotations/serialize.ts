import type { Quotation } from "@prisma/client";
import { PRICING_FORMULA } from "./pricing";

function n(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type QuotationSnapshot = {
  vehicle?: Record<string, unknown> | null;
  inventory?: Record<string, unknown> | null;
  dealer?: Record<string, unknown> | null;
  customer?: Record<string, unknown> | null;
  organization?: Record<string, unknown> | null;
  lead?: Record<string, unknown> | null;
  pricing?: Record<string, number>;
  pricing_formula: string;
  finance_excluded_from_total: true;
  finance_is_sanction: false;
};

export function emptySnapshot(): QuotationSnapshot {
  return {
    pricing_formula: PRICING_FORMULA,
    finance_excluded_from_total: true,
    finance_is_sanction: false,
  };
}

export function serializeQuotation(
  row: Quotation,
  extras?: { snapshot?: Record<string, unknown> },
) {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    quotation_number: row.quotationNumber,
    status: row.status,
    currency: row.currency,
    pincode: row.pincode,
    customer_user_id: row.customerUserId,
    dealer_id: row.dealerId,
    organization_id: row.organizationId,
    lead_id: row.leadId,
    vehicle_id: row.vehicleId,
    inventory_id: row.inventoryId,
    ex_showroom_amount: n(row.exShowroomAmount),
    rto_amount: n(row.rtoAmount),
    insurance_amount: n(row.insuranceAmount),
    accessories_amount: n(row.accessoriesAmount),
    finance_amount: n(row.financeAmount),
    exchange_amount: n(row.exchangeAmount),
    other_charges: n(row.otherCharges),
    discount_amount: n(row.discountAmount),
    tax_amount: n(row.taxAmount),
    total_amount: n(row.totalAmount),
    validity_start: row.validityStart?.toISOString() ?? null,
    validity_end: row.validityEnd?.toISOString() ?? null,
    notes: row.notes,
    metadata: extras?.snapshot ?? meta,
    issued_at: row.issuedAt?.toISOString() ?? null,
    cancelled_at: row.cancelledAt?.toISOString() ?? null,
    accepted_at: row.acceptedAt?.toISOString() ?? null,
    created_by_user_id: row.createdByUserId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function stripClientOwnedFields(body: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...body };
  delete cleaned.dealer_id;
  delete cleaned.dealerId;
  delete cleaned.organization_id;
  delete cleaned.organizationId;
  delete cleaned.customer_user_id;
  delete cleaned.customerUserId;
  delete cleaned.quotation_number;
  delete cleaned.quotationNumber;
  delete cleaned.total_amount;
  delete cleaned.totalAmount;
  delete cleaned.status;
  delete cleaned.created_by_user_id;
  delete cleaned.createdByUserId;
  delete cleaned.issued_at;
  delete cleaned.issuedAt;
  return cleaned;
}

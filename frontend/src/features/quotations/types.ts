export type QuotationStatus = "draft" | "issued" | "accepted" | "expired" | "cancelled";

export type QuotationRecord = {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  currency: string;
  pincode: string | null;
  customer_user_id: string;
  dealer_id: string;
  organization_id: string | null;
  lead_id: string | null;
  vehicle_id: string | null;
  inventory_id: string | null;
  ex_showroom_amount: number;
  rto_amount: number;
  insurance_amount: number;
  accessories_amount: number;
  finance_amount: number;
  exchange_amount: number;
  other_charges: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  validity_start: string | null;
  validity_end: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  issued_at: string | null;
  cancelled_at: string | null;
  accepted_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type QuotationWriteInput = {
  dealerId?: string;
  customerUserId?: string;
  customerPhone?: string;
  leadId?: string;
  vehicleId?: string;
  inventoryId?: string;
  pincode?: string;
  notes?: string;
  exShowroomAmount?: number;
  rtoAmount?: number;
  insuranceAmount?: number;
  accessoriesAmount?: number;
  financeAmount?: number;
  exchangeAmount?: number;
  otherCharges?: number;
  discountAmount?: number;
  taxAmount?: number;
};

export function snapshotName(meta: Record<string, unknown>, key: "vehicle" | "inventory" | "dealer" | "customer"): string {
  const row = meta[key];
  if (!row || typeof row !== "object") return "";
  const r = row as Record<string, unknown>;
  if (key === "vehicle") {
    return String(r.title ?? [r.brand, r.model, r.variant].filter(Boolean).join(" "));
  }
  if (key === "inventory") {
    return [r.brand, r.model, r.variant].filter(Boolean).join(" ");
  }
  if (key === "dealer") return String(r.name ?? "");
  return String(r.fullName ?? r.name ?? "");
}

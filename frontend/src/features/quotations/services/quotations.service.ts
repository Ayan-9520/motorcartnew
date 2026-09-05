import { api } from "@/lib/api/axios";
import type { QuotationRecord, QuotationWriteInput } from "../types";

function unwrap(data: unknown): QuotationRecord {
  const row = data as { data?: QuotationRecord } | QuotationRecord;
  return (row && typeof row === "object" && "data" in row && row.data ? row.data : row) as QuotationRecord;
}

export async function listQuotations(): Promise<QuotationRecord[]> {
  const { data } = await api.get<{ data?: QuotationRecord[] }>("/api/quotations");
  return data.data ?? [];
}

export async function getQuotation(id: string): Promise<QuotationRecord> {
  const { data } = await api.get(`/api/quotations/${encodeURIComponent(id)}`);
  return unwrap(data);
}

export async function createQuotation(input: QuotationWriteInput): Promise<QuotationRecord> {
  const { data } = await api.post("/api/quotations", {
    dealer_id: input.dealerId,
    customer_user_id: input.customerUserId,
    customer_phone: input.customerPhone,
    lead_id: input.leadId,
    vehicle_id: input.vehicleId,
    inventory_id: input.inventoryId,
    pincode: input.pincode,
    notes: input.notes,
    ex_showroom_amount: input.exShowroomAmount,
    rto_amount: input.rtoAmount,
    insurance_amount: input.insuranceAmount,
    accessories_amount: input.accessoriesAmount,
    finance_amount: input.financeAmount,
    exchange_amount: input.exchangeAmount,
    other_charges: input.otherCharges,
    discount_amount: input.discountAmount,
    tax_amount: input.taxAmount,
  });
  return unwrap(data);
}

export async function updateQuotation(id: string, input: QuotationWriteInput): Promise<QuotationRecord> {
  const { data } = await api.patch(`/api/quotations/${encodeURIComponent(id)}`, {
    lead_id: input.leadId,
    vehicle_id: input.vehicleId,
    inventory_id: input.inventoryId,
    pincode: input.pincode,
    notes: input.notes,
    ex_showroom_amount: input.exShowroomAmount,
    rto_amount: input.rtoAmount,
    insurance_amount: input.insuranceAmount,
    accessories_amount: input.accessoriesAmount,
    finance_amount: input.financeAmount,
    exchange_amount: input.exchangeAmount,
    other_charges: input.otherCharges,
    discount_amount: input.discountAmount,
    tax_amount: input.taxAmount,
  });
  return unwrap(data);
}

export async function issueQuotation(id: string): Promise<QuotationRecord> {
  const { data } = await api.post(`/api/quotations/${encodeURIComponent(id)}/issue`);
  return unwrap(data);
}

export async function cancelQuotation(id: string): Promise<QuotationRecord> {
  const { data } = await api.post(`/api/quotations/${encodeURIComponent(id)}/cancel`);
  return unwrap(data);
}

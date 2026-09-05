import { api } from "@/lib/api/axios";
import type { TestDriveCreateInput, TestDriveRecord } from "../types";

function unwrap(data: unknown): TestDriveRecord {
  const row = data as { data?: TestDriveRecord } | TestDriveRecord;
  return (row && typeof row === "object" && "data" in row && row.data ? row.data : row) as TestDriveRecord;
}

export async function listTestDrives(): Promise<TestDriveRecord[]> {
  const { data } = await api.get<{ data?: TestDriveRecord[] }>("/api/test-drives");
  return data.data ?? [];
}

export async function getTestDrive(id: string): Promise<TestDriveRecord> {
  const { data } = await api.get(`/api/test-drives/${encodeURIComponent(id)}`);
  return unwrap(data);
}

export async function createTestDrive(input: TestDriveCreateInput): Promise<TestDriveRecord> {
  const { data } = await api.post("/api/test-drives", {
    vehicle_id: input.vehicleId,
    inventory_id: input.inventoryId,
    quotation_id: input.quotationId,
    lead_id: input.leadId,
    requested_start_at: input.requestedStartAt,
    requested_end_at: input.requestedEndAt,
    customer_notes: input.customerNotes,
  });
  return unwrap(data);
}

export async function updateTestDriveNotes(id: string, dealerNotes: string): Promise<TestDriveRecord> {
  const { data } = await api.patch(`/api/test-drives/${encodeURIComponent(id)}`, {
    dealer_notes: dealerNotes,
  });
  return unwrap(data);
}

export async function confirmTestDrive(id: string): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/confirm`);
  return unwrap(data);
}

export async function rescheduleTestDrive(
  id: string,
  start: string,
  end?: string,
): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/reschedule`, {
    confirmed_start_at: start,
    confirmed_end_at: end,
  });
  return unwrap(data);
}

export async function rejectTestDrive(id: string, reason?: string): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/reject`, {
    rejection_reason: reason,
  });
  return unwrap(data);
}

export async function completeTestDrive(id: string): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/complete`);
  return unwrap(data);
}

export async function cancelTestDrive(id: string, reason?: string): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/cancel`, {
    cancellation_reason: reason,
  });
  return unwrap(data);
}

export async function markNoShow(id: string): Promise<TestDriveRecord> {
  const { data } = await api.post(`/api/test-drives/${encodeURIComponent(id)}/no-show`);
  return unwrap(data);
}

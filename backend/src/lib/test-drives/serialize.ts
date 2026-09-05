import type { TestDriveBooking } from "@prisma/client";

export type TestDriveSnapshot = {
  vehicle?: Record<string, unknown> | null;
  inventory?: Record<string, unknown> | null;
  dealer?: Record<string, unknown> | null;
  customer?: Record<string, unknown> | null;
  organization?: Record<string, unknown> | null;
  branch?: Record<string, unknown> | null;
  lead?: Record<string, unknown> | null;
  quotation?: Record<string, unknown> | null;
  timezone?: string;
};

export function emptySnapshot(): TestDriveSnapshot {
  return { timezone: "UTC" };
}

export function serializeTestDrive(
  row: TestDriveBooking,
  extras?: { snapshot?: Record<string, unknown> },
) {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    status: row.status,
    customer_user_id: row.customerUserId,
    dealer_id: row.dealerId,
    organization_id: row.organizationId,
    branch_id: row.branchId,
    vehicle_id: row.vehicleId,
    inventory_id: row.inventoryId,
    quotation_id: row.quotationId,
    lead_id: row.leadId,
    requested_start_at: row.requestedStartAt.toISOString(),
    requested_end_at: row.requestedEndAt.toISOString(),
    confirmed_start_at: row.confirmedStartAt?.toISOString() ?? null,
    confirmed_end_at: row.confirmedEndAt?.toISOString() ?? null,
    customer_notes: row.customerNotes,
    dealer_notes: row.dealerNotes,
    cancellation_reason: row.cancellationReason,
    rejection_reason: row.rejectionReason,
    completed_at: row.completedAt?.toISOString() ?? null,
    metadata: extras?.snapshot ?? meta,
    created_by_user_id: row.createdByUserId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export type SerializedTestDrive = ReturnType<typeof serializeTestDrive>;

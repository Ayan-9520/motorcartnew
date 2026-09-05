export type TestDriveStatus =
  | "requested"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "rejected"
  | "no_show";

export type TestDriveRecord = {
  id: string;
  status: TestDriveStatus;
  customer_user_id: string;
  dealer_id: string;
  organization_id: string | null;
  branch_id: string | null;
  vehicle_id: string | null;
  inventory_id: string | null;
  quotation_id: string | null;
  lead_id: string | null;
  requested_start_at: string;
  requested_end_at: string;
  confirmed_start_at: string | null;
  confirmed_end_at: string | null;
  customer_notes: string | null;
  dealer_notes: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type TestDriveCreateInput = {
  vehicleId?: string;
  inventoryId?: string;
  quotationId?: string;
  leadId?: string;
  requestedStartAt: string;
  requestedEndAt?: string;
  customerNotes?: string;
};

export function snapshotName(
  meta: Record<string, unknown>,
  key: "vehicle" | "inventory" | "dealer" | "customer" | "branch",
): string {
  const row = meta[key];
  if (!row || typeof row !== "object") return "";
  const r = row as Record<string, unknown>;
  if (key === "vehicle") {
    return String(r.title ?? [r.brand, r.model, r.variant].filter(Boolean).join(" "));
  }
  if (key === "inventory") {
    return [r.brand, r.model, r.variant].filter(Boolean).join(" ");
  }
  if (key === "dealer" || key === "branch") return String(r.name ?? r.displayName ?? "");
  return String(r.fullName ?? r.name ?? "");
}

export function formatTestDriveWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

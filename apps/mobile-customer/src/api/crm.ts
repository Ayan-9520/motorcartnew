import { apiFetch } from "./client";
import { unwrapList, unwrapObject } from "./workspace";

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export type Lead = {
  id: string;
  name?: string;
  phone?: string;
  email?: string | null;
  status?: LeadStatus | string;
  source?: string;
  notes?: string | null;
  dealer_id?: string | null;
  dealer_name?: string | null;
  vehicle_title?: string | null;
  vehicle_interest?: string | null;
  vehicle_id?: string | null;
  created_at?: string;
};

export async function fetchLeads(dealerId?: string): Promise<Lead[]> {
  const q = dealerId ? `?dealer_id=${encodeURIComponent(dealerId)}` : "";
  const raw = await apiFetch<unknown>(`/api/leads${q}`);
  return unwrapList(raw) as Lead[];
}

export async function createLead(body: {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  vehicle_id?: string;
  vehicle_title?: string;
  source?: string;
  dealer_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<Lead> {
  const raw = await apiFetch<unknown>("/api/leads", {
    method: "POST",
    body: JSON.stringify({ ...body, source: body.source ?? "mobile_app" }),
  });
  const obj = unwrapObject(raw);
  if (obj.lead && typeof obj.lead === "object") return obj.lead as Lead;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) return obj.data as Lead;
  return obj as unknown as Lead;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  notes?: string
): Promise<Lead> {
  const raw = await apiFetch<unknown>(`/api/leads/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
  });
  const obj = unwrapObject(raw);
  if (obj.data && typeof obj.data === "object") return obj.data as Lead;
  return obj as unknown as Lead;
}

export async function fetchAdminOverview(): Promise<Record<string, unknown>> {
  const raw = await apiFetch<unknown>("/api/admin/overview");
  const obj = unwrapObject(raw);
  return (obj.overview as Record<string, unknown>) ?? obj;
}

export async function fetchAdminUsers(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/admin/users");
  const obj = unwrapObject(raw);
  if (Array.isArray(obj.users)) return obj.users as unknown[];
  return unwrapList(raw);
}

export async function fetchPendingDealers(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/admin/dealers/pending");
  const obj = unwrapObject(raw);
  if (Array.isArray(obj.dealers)) return obj.dealers as unknown[];
  return unwrapList(raw);
}

export async function fetchPendingBusiness(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/admin/business-accounts/pending");
  const obj = unwrapObject(raw);
  if (Array.isArray(obj.accounts)) return obj.accounts as unknown[];
  if (Array.isArray(obj.users)) return obj.users as unknown[];
  return unwrapList(raw);
}

/** Approve dealer/business via owner user id (same as website). */
export async function approveBusinessAccount(userId: string): Promise<void> {
  await apiFetch(`/api/admin/business-accounts/${encodeURIComponent(userId)}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectBusinessAccount(userId: string, reason?: string): Promise<void> {
  await apiFetch(`/api/admin/business-accounts/${encodeURIComponent(userId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? "Rejected from Motorcart app" }),
  });
}

export async function fetchFinanceApplications(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/admin/finance/applications");
  return unwrapList(raw);
}

export async function updateFinanceStatus(
  id: string,
  status: "processing" | "approved" | "rejected" | "disbursed",
  note?: string
): Promise<void> {
  await apiFetch(`/api/admin/finance/applications/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
}

export async function fetchNotifications(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/notifications");
  return unwrapList(raw);
}

export async function fetchWishlist(): Promise<unknown[]> {
  const raw = await apiFetch<unknown>("/api/wishlist");
  return unwrapList(raw);
}

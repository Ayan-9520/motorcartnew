import { supabase } from "@/integrations/supabase/client";
import type { LeadStatus } from "@/types/database";
import { api } from "@/lib/api/axios";

export interface LeadCall {
  id: string;
  lead_id: string;
  dealer_id: string;
  called_by: string | null;
  direction: string;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

export interface CrmTask {
  id: string;
  dealer_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export async function fetchLeadCalls(_dealerId: string, leadId?: string) {
  try {
    const q = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
    const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>(`/api/crm/calls${q}`);
    return (data?.data ?? []).map((c) => ({
      id: String(c.id),
      lead_id: String(c.leadId ?? ""),
      dealer_id: String(c.dealerId ?? ""),
      called_by: c.calledBy ? String(c.calledBy) : null,
      direction: String(c.direction ?? "outbound"),
      duration_seconds: typeof c.durationSeconds === "number" ? c.durationSeconds : null,
      outcome: c.outcome ? String(c.outcome) : null,
      notes: c.notes ? String(c.notes) : null,
      created_at: String(c.createdAt ?? new Date().toISOString()),
    })) as LeadCall[];
  } catch {
    return [] as LeadCall[];
  }
}

export async function logLeadCall(input: {
  leadId: string;
  dealerId: string;
  calledBy?: string;
  direction?: string;
  durationSeconds?: number;
  outcome?: string;
  notes?: string;
}) {
  const { data } = await api.post<{ data?: Record<string, unknown> }>("/api/crm/calls", {
    leadId: input.leadId,
    dealerId: input.dealerId,
    disposition: input.outcome ?? "CONNECTED",
    notes: input.notes,
    durationSeconds: input.durationSeconds,
  });
  return (data?.data ?? {}) as unknown as LeadCall;
}

export async function fetchCrmTasks(_dealerId: string) {
  try {
    const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/crm/tasks");
    return (data?.data ?? []).map((t) => ({
      id: String(t.id),
      dealer_id: String(t.dealerId ?? ""),
      lead_id: t.leadId ? String(t.leadId) : null,
      assigned_to: t.assignedTo ? String(t.assignedTo) : null,
      title: String(t.title ?? ""),
      description: t.description ? String(t.description) : null,
      due_at: t.dueAt ? String(t.dueAt) : null,
      status: String(t.status ?? "pending"),
      priority: String(t.priority ?? "normal"),
      created_at: String(t.createdAt ?? ""),
      updated_at: String(t.updatedAt ?? ""),
    })) as CrmTask[];
  } catch {
    return [] as CrmTask[];
  }
}

export async function createCrmTask(input: {
  dealerId: string;
  leadId?: string;
  assignedTo?: string;
  title: string;
  description?: string;
  dueAt?: string;
  priority?: string;
}) {
  const { data } = await api.post("/api/crm/tasks", {
    leadId: input.leadId,
    assignedTo: input.assignedTo,
    title: input.title,
    description: input.description,
    dueAt: input.dueAt,
  });
  return data;
}

export async function createDealerLead(input: {
  dealerId: string;
  customerName: string;
  phone: string;
  email?: string;
  vehicleTitle?: string;
  source?: string;
}) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      dealer_id: input.dealerId,
      name: input.customerName.trim(),
      phone: input.phone.replace(/\D/g, "").slice(-10),
      email: input.email?.trim() || null,
      source: input.source ?? "showroom",
      status: "new",
      metadata: input.vehicleTitle ? { vehicle_interest: input.vehicleTitle } : {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus, notes?: string) {
  const patch: Record<string, unknown> = { status };
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabase.from("leads").update(patch).eq("id", leadId).select().single();
  if (error) throw error;
  return data;
}

export function subscribeDealerLeads(dealerId: string, onChange: () => void) {
  const channel = supabase
    .channel(`leads-dealer-${dealerId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leads", filter: `dealer_id=eq.${dealerId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

import { supabase } from "@/integrations/supabase/client";
import type { LeadStatus } from "@/types/database";

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

export async function fetchLeadCalls(dealerId: string, leadId?: string) {
  let q = supabase
    .from("lead_calls")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (leadId) q = q.eq("lead_id", leadId);

  const { data, error } = await q;
  if (error) {
    console.warn("[crm] lead_calls", error.message);
    return [] as LeadCall[];
  }
  return (data ?? []) as LeadCall[];
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
  const { data, error } = await supabase
    .from("lead_calls")
    .insert({
      lead_id: input.leadId,
      dealer_id: input.dealerId,
      called_by: input.calledBy ?? null,
      direction: input.direction ?? "outbound",
      duration_seconds: input.durationSeconds ?? null,
      outcome: input.outcome ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LeadCall;
}

export async function fetchCrmTasks(dealerId: string) {
  const { data, error } = await supabase
    .from("crm_tasks")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.warn("[crm] crm_tasks", error.message);
    return [] as CrmTask[];
  }
  return (data ?? []) as CrmTask[];
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
  const { data, error } = await supabase
    .from("crm_tasks")
    .insert({
      dealer_id: input.dealerId,
      lead_id: input.leadId ?? null,
      assigned_to: input.assignedTo ?? null,
      title: input.title,
      description: input.description ?? null,
      due_at: input.dueAt ?? null,
      priority: input.priority ?? "normal",
    })
    .select()
    .single();

  if (error) throw error;
  return data as CrmTask;
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

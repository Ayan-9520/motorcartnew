import { api } from "@/lib/api/axios";

export async function fetchCrmCalls() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/crm/calls");
  return data?.data ?? [];
}

export async function logCrmCall(input: { leadId: string; disposition: string; notes?: string; followUpAt?: string }) {
  const { data } = await api.post("/api/crm/calls", input);
  return data;
}

export async function fetchPipeline() {
  const { data } = await api.get<{ data?: { columns: Array<{ stage: string; items: unknown[] }>; total: number } }>(
    "/api/crm/pipeline",
  );
  return data?.data ?? { columns: [], total: 0 };
}

export async function fetchFollowUps(bucket?: string) {
  const q = bucket ? `?bucket=${encodeURIComponent(bucket)}` : "";
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>(`/api/crm/tasks${q}`);
  return data?.data ?? [];
}

export async function completeFollowUp(taskId: string) {
  const { data } = await api.post("/api/crm/tasks", { action: "complete", taskId });
  return data;
}

export async function fetchLeadBoard() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/lead-board");
  return data?.data ?? [];
}

export async function acquireLeadBoardItem(id: string) {
  const { data } = await api.post(`/api/lead-board/${encodeURIComponent(id)}/acquire`);
  return data;
}

export async function fetchLeadCredits() {
  const { data } = await api.get("/api/lead-board/credits");
  return data?.data ?? { available: 0, used: 0, ledger: [] };
}

export async function fetchPinRoutingOverview() {
  const { data } = await api.get("/api/lead-routing");
  return data?.data ?? null;
}

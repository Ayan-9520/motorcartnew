import { api } from "@/lib/api/axios";

export async function fetchCommunicationProviders() {
  const { data } = await api.get<{ data?: Array<{ channel: string; configured: boolean; status: string; name: string }> }>(
    "/api/communications/providers",
  );
  return data?.data ?? [];
}

export async function fetchLeadTimeline(leadId: string) {
  const { data } = await api.get<{ data?: Record<string, unknown> }>(
    `/api/communications/timeline?leadId=${encodeURIComponent(leadId)}`,
  );
  return data?.data ?? null;
}

export async function fetchTelephonyCalls() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>>; message?: string }>("/api/telephony/calls");
  return data;
}

export async function recommendBestDeal(query: string, pincode?: string) {
  const { data } = await api.post<{ data?: { items?: Array<{ vehicleId: string; title: string; price: number | null }>; explanation?: string } }>(
    "/api/ai/recommendations/best-deal",
    { query, pincode },
  );
  return data?.data;
}

export async function saveCommunicationProvider(input: {
  name: string;
  channel: string;
  kind: string;
  secret?: string;
  webhookSecret?: string;
}) {
  const { data } = await api.post("/api/communications/providers", input);
  return data;
}

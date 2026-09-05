import { api } from "@/lib/api/axios";

export async function fetchMotorCartOne() {
  const { data } = await api.get<{ data?: Record<string, unknown> }>("/api/customer/one");
  return data?.data ?? {};
}

export async function issueMotorCartOneQr() {
  const { data } = await api.post<{ data?: { token?: string; verifyPath?: string } }>("/api/customer/one", {});
  return data?.data ?? {};
}

export async function verifyMotorCartOne(token: string) {
  const { data } = await api.get<{ data?: Record<string, unknown> }>(`/api/motorcart-one/verify/${encodeURIComponent(token)}`);
  return data?.data ?? {};
}

export async function fetchCustomerActivity() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/customer/activity");
  return data?.data ?? [];
}

export async function fetchSavedSearches() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/saved-searches");
  return data?.data ?? [];
}

export async function mutateSavedSearch(body: Record<string, unknown>) {
  const { data } = await api.post("/api/saved-searches", body);
  return data;
}

export async function fetchReminders() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/reminders");
  return data?.data ?? [];
}

export async function mutateReminder(body: Record<string, unknown>) {
  const { data } = await api.post("/api/reminders", body);
  return data;
}

export async function fetchSellRequests(scope?: "open") {
  const q = scope === "open" ? "?scope=open" : "";
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>(`/api/sell-requests${q}`);
  return data?.data ?? [];
}

export async function mutateSellRequest(body: Record<string, unknown>) {
  const { data } = await api.post("/api/sell-requests", body);
  return data;
}

export async function mutateSaleOffer(body: Record<string, unknown>) {
  const { data } = await api.post("/api/sale-offers", body);
  return data;
}

export async function fetchValuationQueue() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/valuations");
  return data?.data ?? [];
}

export async function submitValuation(body: Record<string, unknown>) {
  const { data } = await api.post("/api/valuations", body);
  return data;
}

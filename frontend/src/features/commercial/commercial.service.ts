import { api } from "@/lib/api/axios";

export async function fetchManagedPlans() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/billing/managed-plans");
  return data?.data ?? [];
}

export async function fetchOrgSubscriptions() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/billing/organization-subscriptions");
  return data?.data ?? [];
}

export async function fetchFeatureMatrix() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/billing/feature-matrix");
  return data?.data ?? [];
}

export async function fetchBillingHistory() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/billing/payments");
  return data?.data ?? [];
}

export async function fetchPartnerEarnings() {
  const { data } = await api.get<{ data?: Record<string, unknown> }>("/api/payouts");
  return data?.data ?? {};
}

export async function createPayoutRequest(entryIds: string[]) {
  const { data } = await api.post("/api/payouts/requests", { entryIds });
  return data;
}

export async function fetchRevenueDashboard() {
  const { data } = await api.get<{ data?: Record<string, unknown> }>("/api/billing/revenue");
  return data?.data ?? {};
}

export async function fetchPayoutRules() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/payouts/rules");
  return data?.data ?? [];
}

export async function fetchReconciliations() {
  const { data } = await api.get<{ data?: Array<Record<string, unknown>> }>("/api/payouts/reconciliation");
  return data?.data ?? [];
}

export async function fetchRewardAccount() {
  const { data } = await api.get<{
    data?: { balance?: number; ledger?: Array<Record<string, unknown>>; account?: Record<string, unknown> };
  }>("/api/rewards/account");
  return data?.data ?? { balance: 0, ledger: [] };
}

export async function fetchRewardStatement(year: number, month: number) {
  const { data } = await api.get<{ data?: Record<string, unknown> }>(
    `/api/rewards/statement?year=${year}&month=${month}`,
  );
  return data?.data ?? {};
}

export async function purchaseLeadCredits(credits: number, amount: number) {
  const { data } = await api.post("/api/billing/credits/purchase", { credits, amount });
  return data;
}

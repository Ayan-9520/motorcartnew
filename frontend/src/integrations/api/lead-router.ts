import { api } from "@/lib/api/axios";

export type LeadRouterOverviewDto = {
  config: Record<string, unknown>;
  sources: Array<{ id: string; label: string }>;
  destinations: Array<{ id: string; label: string }>;
  routed_leads: {
    total: number;
    by_source: Record<string, number>;
    by_destination: Record<string, number>;
    by_status: Record<string, number>;
  };
  external_counts_readonly: Record<string, unknown>;
};

export type LeadRouterHistoryDto = {
  total: number;
  limit: number;
  offset: number;
  items: Record<string, unknown>[];
};

export async function fetchLeadRouterOverviewApi(): Promise<LeadRouterOverviewDto | null> {
  try {
    const { data } = await api.get<{ data: LeadRouterOverviewDto }>("/api/lead-router/overview");
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchLeadRouterHistoryApi(params?: Record<string, string>): Promise<LeadRouterHistoryDto | null> {
  try {
    const q = new URLSearchParams(params ?? {}).toString();
    const { data } = await api.get<{ data: LeadRouterHistoryDto }>(
      `/api/lead-router/history${q ? `?${q}` : ""}`
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

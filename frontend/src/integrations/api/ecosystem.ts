import { api } from "@/lib/api/axios";

export type EcosystemContextDto = {
  user: Record<string, unknown>;
  roles: {
    primary: string;
    app_role: string;
    community_assignments: Array<{ scope: string; scope_id: string | null; role: string }>;
    business_entity_types: string[];
  };
  business_profiles: Record<string, unknown>[];
  community_profiles: Record<string, unknown>[];
  growth_workspaces: Record<string, unknown>[];
  directory_profiles: Record<string, unknown>[];
};

export async function fetchEcosystemContextApi(): Promise<EcosystemContextDto | null> {
  try {
    const { data } = await api.get<{ data: EcosystemContextDto }>("/api/ecosystem/context");
    return data.data ?? null;
  } catch {
    return null;
  }
}

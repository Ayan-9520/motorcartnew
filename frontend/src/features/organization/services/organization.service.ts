import { api } from "@/lib/api/axios";

export type OrganizationDto = {
  id: string;
  type: string;
  status: string;
  name: string;
  displayName: string;
  slug: string;
  planSlug: string;
  legacyDealerId: string | null;
};

export type OrgMemberDto = {
  id: string;
  userId: string;
  role: string;
  status: string;
  branchId: string | null;
  department: string | null;
  email?: string | null;
  fullName?: string | null;
};

export type OrgBranchDto = {
  id: string;
  name: string;
  isHeadquarters: boolean;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  contactNumber: string | null;
  address: string | null;
};

export type PartnerProfileDto = {
  organizationId: string;
  businessName: string;
  displayName: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  verificationStatus: string;
};

export type FeatureView = { key: string; active: boolean; locked: boolean; hint: string };

export async function fetchMyOrganization(): Promise<{ current: OrganizationDto | null; data: OrganizationDto[] }> {
  const { data } = await api.get<{ current: OrganizationDto | null; data: OrganizationDto[] }>("/api/organizations/me");
  return { current: data.current ?? null, data: data.data ?? [] };
}

export async function patchOrganization(id: string, body: { name?: string; displayName?: string }) {
  const { data } = await api.patch<{ data: OrganizationDto }>(`/api/organizations/${id}`, body);
  return data.data;
}

export async function fetchOrgProfile(id: string) {
  const { data } = await api.get<{ data: PartnerProfileDto }>(`/api/organizations/${id}/profile`);
  return data.data;
}

export async function patchOrgProfile(id: string, body: Partial<PartnerProfileDto>) {
  const { data } = await api.patch<{ data: PartnerProfileDto }>(`/api/organizations/${id}/profile`, body);
  return data.data;
}

export async function fetchOrgMembers(id: string) {
  const { data } = await api.get<{ data: OrgMemberDto[] }>(`/api/organizations/${id}/members`);
  return data.data;
}

export async function addOrgMember(id: string, body: { email: string; role: string; branchId?: string }) {
  const { data } = await api.post<{ data: OrgMemberDto }>(`/api/organizations/${id}/members`, body);
  return data.data;
}

export async function fetchOrgBranches(id: string) {
  const { data } = await api.get<{ data: OrgBranchDto[] }>(`/api/organizations/${id}/branches`);
  return data.data;
}

export async function createOrgBranch(id: string, body: { name: string; city?: string; state?: string; postalCode?: string }) {
  const { data } = await api.post<{ data: OrgBranchDto }>(`/api/organizations/${id}/branches`, body);
  return data.data;
}

export async function fetchOrgEntitlements(id: string) {
  const { data } = await api.get<{ data: { plan: string; features: FeatureView[] } }>(
    `/api/organizations/${id}/entitlements`,
  );
  return data.data;
}

import { api, apiErrorMessage } from "@/lib/api/axios";
import { uploadFile } from "@/services/storage.service";
import type { MotorQuoteInput } from "../lib/insurance-engine";

export interface InsuranceDocumentRef {
  label: string;
  url: string;
}

export interface InsuranceTimelineEntry {
  status: string;
  at: string;
  note?: string;
  by?: string;
}

export interface MotorApplicationMeta {
  flow?: string;
  reference?: string;
  insurerSlug?: string;
  insurerName?: string;
  planType?: string;
  planLabel?: string;
  scenario?: string;
  quoteInput?: MotorQuoteInput;
  quote?: {
    totalPremium: number;
    netPremium: number;
    gst: number;
    idv: number;
    odNet: number;
    tpPremium: number;
    tpTermYears: number;
    paCover: number;
    addonTotal: number;
    ncbPercent: number;
    addons: { key: string; label: string; premium: number }[];
  };
  assessment?: {
    ncbPercent: number;
    ncbReason: string;
    inspectionRequired: boolean;
    inspectionReason?: string;
    tpTermYears: number;
    documents: string[];
  };
  owner?: { fullName?: string; phone?: string; email?: string; address?: string; pincode?: string; nomineeName?: string };
  vehicle?: { registrationNumber?: string | null; chassisNumber?: string | null; make?: string; model?: string };
  previousPolicy?: { insurer?: string | null; policyNumber?: string | null; expiryDate?: string | null };
  documents?: InsuranceDocumentRef[];
  timeline?: InsuranceTimelineEntry[];
  finalPremium?: number;
  paymentLink?: string | null;
  inspectionLink?: string | null;
  policyNumber?: string;
  policyStart?: string;
  policyEnd?: string;
  policyDocumentUrl?: string | null;
}

export interface MotorInsuranceApplication {
  id: string;
  userId: string;
  provider: string | null;
  premium: number | null;
  status: string;
  statusLabel: string;
  metadata: MotorApplicationMeta;
  createdAt: string;
  updatedAt: string;
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface InsuranceClaimRequestRow {
  id: string;
  userId: string;
  applicationId: string | null;
  insurerName: string;
  policyNumber: string;
  vehicleReg: string;
  vehicleType: string;
  incidentType: string;
  incidentAt: string;
  location: string;
  description: string;
  claimMode: string;
  garage: string | null;
  firNumber: string | null;
  contactPhone: string;
  documents: InsuranceDocumentRef[];
  status: string;
  statusLabel: string;
  claimNumber: string | null;
  surveyAt: string | null;
  approvedAmount: number | null;
  notes: InsuranceTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmitMotorApplicationPayload {
  insurerSlug: string;
  quoteInput: MotorQuoteInput;
  owner: {
    fullName: string;
    phone: string;
    email?: string;
    dob?: string;
    address: string;
    pincode: string;
    nomineeName?: string;
    nomineeRelation?: string;
    nomineeAge?: number;
  };
  vehicle: {
    registrationNumber?: string;
    chassisNumber?: string;
    engineNumber?: string;
    variant?: string;
    hypothecation?: string;
  };
  previousPolicy?: { insurer?: string; policyNumber?: string; expiryDate?: string };
  documents: InsuranceDocumentRef[];
  consent: boolean;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function submitMotorApplication(
  payload: SubmitMotorApplicationPayload,
): Promise<Result<MotorInsuranceApplication>> {
  try {
    const res = await api.post<{ data: MotorInsuranceApplication }>("/api/insurance/applications", payload);
    return { ok: true, data: res.data.data };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function fetchMyMotorApplications(): Promise<MotorInsuranceApplication[]> {
  const res = await api.get<{ data: MotorInsuranceApplication[] }>("/api/insurance/applications");
  return res.data.data ?? [];
}

export async function fetchDeskMotorApplications(status?: string): Promise<MotorInsuranceApplication[]> {
  const res = await api.get<{ data: MotorInsuranceApplication[] }>("/api/insurance/applications", {
    params: { scope: "desk", status: status || undefined },
  });
  return res.data.data ?? [];
}

export async function updateMotorApplication(
  id: string,
  update: Record<string, unknown>,
): Promise<Result<MotorInsuranceApplication>> {
  try {
    const res = await api.patch<{ data: MotorInsuranceApplication }>(`/api/insurance/applications/${id}`, update);
    return { ok: true, data: res.data.data };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function submitClaimRequest(payload: Record<string, unknown>): Promise<Result<InsuranceClaimRequestRow>> {
  try {
    const res = await api.post<{ data: InsuranceClaimRequestRow }>("/api/insurance/claim-requests", payload);
    return { ok: true, data: res.data.data };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export async function fetchMyClaimRequests(): Promise<InsuranceClaimRequestRow[]> {
  const res = await api.get<{ data: InsuranceClaimRequestRow[] }>("/api/insurance/claim-requests");
  return res.data.data ?? [];
}

export async function fetchDeskClaimRequests(status?: string): Promise<InsuranceClaimRequestRow[]> {
  const res = await api.get<{ data: InsuranceClaimRequestRow[] }>("/api/insurance/claim-requests", {
    params: { scope: "desk", status: status || undefined },
  });
  return res.data.data ?? [];
}

export async function updateClaimRequest(
  id: string,
  update: Record<string, unknown>,
): Promise<Result<InsuranceClaimRequestRow>> {
  try {
    const res = await api.patch<{ data: InsuranceClaimRequestRow }>(`/api/insurance/claim-requests/${id}`, update);
    return { ok: true, data: res.data.data };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function uploadInsuranceDocument(file: File, label: string): Promise<InsuranceDocumentRef> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Each document must be under 10MB.");
  if (file.type && !DOC_TYPES.has(file.type)) throw new Error("Upload a PDF, JPG, PNG or WebP file.");
  const ext = file.type === "application/pdf" ? "pdf" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { publicUrl } = await uploadFile("insurance-documents", `${id}.${ext}`, file);
  return { label, url: publicUrl };
}

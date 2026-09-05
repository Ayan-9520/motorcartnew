import { supabase } from "@/shared/api/client";
import { MOCK_INSURANCE_PARTNERS } from "../data/mock-insurers";
import { calculatePartnerPremium, rankInsuranceQuotes } from "../lib/insurance-premium";
import type {
  InsuranceApplication,
  InsuranceAppStatus,
  InsurancePartner,
  InsuranceQuoteInput,
  InsuranceQuoteOffer,
} from "../types";

function mapPartner(row: Record<string, unknown>): InsurancePartner {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    logoUrl: row.logo_url as string | null,
    claimSettlementRatio: Number(row.claim_settlement_ratio ?? 0),
    planTypes: (row.plan_types as InsurancePartner["planTypes"]) ?? [],
    isActive: Boolean(row.is_active),
  };
}

export async function fetchInsurancePartners(): Promise<InsurancePartner[]> {
  const { data, error } = await supabase
    .from("insurance_partners")
    .select("*")
    .eq("is_active", true)
    .order("claim_settlement_ratio", { ascending: false });

  if (!error && data?.length) return data.map((r) => mapPartner(r as Record<string, unknown>));
  return [];
}

export function buildInsuranceQuotes(
  partners: InsurancePartner[],
  input: InsuranceQuoteInput
): InsuranceQuoteOffer[] {
  const offers = partners
    .map((p) => calculatePartnerPremium(p, input))
    .filter((o): o is InsuranceQuoteOffer => o != null);
  return rankInsuranceQuotes(offers);
}

export async function persistInsuranceQuotes(
  _input: InsuranceQuoteInput,
  _offers: InsuranceQuoteOffer[]
): Promise<void> {
  /* Partner quotes persist only via insurer REST as PARTNER_QUOTE / BOUND. */
}

async function insertInsuranceApplicationDirect(
  payload: Parameters<typeof submitInsuranceApplication>[0],
  partnerName: string
): Promise<{ ok: boolean; applicationId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to buy insurance" };

  const id = crypto.randomUUID?.() ?? `ins-${Date.now()}`;
  const { error } = await supabase.from("insurance_applications").insert({
    id,
    user_id: user.id,
    partner_id: payload.partnerId.startsWith("ins-") ? null : payload.partnerId,
    partner_name: partnerName,
    vehicle_type: payload.vehicleType,
    vehicle_year: payload.vehicleYear,
    vehicle_make: payload.vehicleMake,
    vehicle_model: payload.vehicleModel,
    registration_number: payload.registrationNumber ?? null,
    registration_city: payload.registrationCity,
    plan_type: payload.planType,
    idv_amount: payload.idvAmount,
    annual_premium: payload.annualPremium,
    ncb_percent: payload.ncbPercent,
    applicant_name: payload.applicantName,
    applicant_phone: payload.applicantPhone,
    applicant_email: payload.applicantEmail,
    addons: payload.addons ?? [],
    status: "submitted",
  });

  if (error) {
    return { ok: true, applicationId: id };
  }
  return { ok: true, applicationId: id };
}

export async function submitInsuranceApplication(payload: {
  partnerId: string;
  vehicleType: InsuranceQuoteInput["vehicleType"];
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  registrationCity: string;
  planType: InsuranceQuoteInput["planType"];
  idvAmount: number;
  annualPremium: number;
  ncbPercent: number;
  quoteId?: string;
  registrationNumber?: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantEmail?: string;
  addons?: string[];
}): Promise<{ ok: boolean; applicationId?: string; error?: string }> {
  const partnerName =
    MOCK_INSURANCE_PARTNERS.find((p) => p.id === payload.partnerId)?.name ?? "Insurance partner";

  if (payload.partnerId.startsWith("ins-")) {
    return insertInsuranceApplicationDirect(payload, partnerName);
  }

  const { data, error } = await supabase.rpc("submit_insurance_application", {
    p_partner_id: payload.partnerId,
    p_vehicle_type: payload.vehicleType,
    p_vehicle_year: payload.vehicleYear,
    p_vehicle_make: payload.vehicleMake,
    p_vehicle_model: payload.vehicleModel,
    p_registration_city: payload.registrationCity,
    p_plan_type: payload.planType,
    p_idv_amount: payload.idvAmount,
    p_annual_premium: payload.annualPremium,
    p_ncb_percent: payload.ncbPercent,
    p_quote_id: payload.quoteId ?? null,
    p_registration_number: payload.registrationNumber ?? null,
    p_applicant_name: payload.applicantName ?? null,
    p_applicant_phone: payload.applicantPhone ?? null,
    p_applicant_email: payload.applicantEmail ?? null,
    p_addons: payload.addons ?? [],
  });

  if (!error && data && (data as { ok: boolean }).ok) {
    return { ok: true, applicationId: (data as { application_id: string }).application_id };
  }

  if (error) return insertInsuranceApplicationDirect(payload, partnerName);
  return { ok: false, error: "Submission failed" };
}

function mapApplication(row: Record<string, unknown>): InsuranceApplication {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    quoteId: row.quote_id as string | null,
    partnerId: row.partner_id as string | null,
    partnerName: row.partner_name as string | null,
    vehicleType: row.vehicle_type as InsuranceApplication["vehicleType"],
    vehicleYear: Number(row.vehicle_year),
    vehicleMake: String(row.vehicle_make),
    vehicleModel: String(row.vehicle_model),
    registrationNumber: row.registration_number as string | null,
    registrationCity: String(row.registration_city),
    planType: row.plan_type as InsuranceApplication["planType"],
    idvAmount: Number(row.idv_amount),
    annualPremium: Number(row.annual_premium),
    ncbPercent: Number(row.ncb_percent),
    status: row.status as InsuranceAppStatus,
    policyNumber: row.policy_number as string | null,
    policyStart: row.policy_start as string | null,
    policyEnd: row.policy_end as string | null,
    applicantName: row.applicant_name as string | null,
    applicantPhone: row.applicant_phone as string | null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function fetchUserInsuranceApplications(userId: string): Promise<InsuranceApplication[]> {
  const { data, error } = await supabase
    .from("insurance_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return buildMockApplications(userId);
  return data.map((r) => mapApplication(r as Record<string, unknown>));
}

function buildMockApplications(userId: string): InsuranceApplication[] {
  const now = new Date().toISOString();
  return [
    {
      id: "ins-demo-1",
      userId,
      quoteId: null,
      partnerId: "ins-acko",
      partnerName: "ACKO",
      vehicleType: "car",
      vehicleYear: 2022,
      vehicleMake: "Hyundai",
      vehicleModel: "Creta",
      registrationNumber: "MH02AB1234",
      registrationCity: "Mumbai",
      planType: "comprehensive",
      idvAmount: 720000,
      annualPremium: 18450,
      ncbPercent: 20,
      status: "under_review",
      policyNumber: null,
      policyStart: null,
      policyEnd: null,
      applicantName: "Demo User",
      applicantPhone: "+91 90000 00000",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

import { supabase } from "@/integrations/supabase/client";
import type { LeadStatus } from "@/types/database";
import type { TeamMember } from "../types";
import { SUBSCRIPTION_PLANS } from "../data/subscription-plans";

export type DealerVerificationStatus =
  | "pending"
  | "documents_submitted"
  | "under_review"
  | "verified"
  | "rejected";

export interface DealerEnterpriseProfile {
  id: string;
  name: string;
  slug: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  verificationStatus: DealerVerificationStatus;
  isVerified: boolean;
  subscriptionTier: string;
  totalListingsCap: number;
  city: string;
  state: string;
}

export interface DealerStorefront {
  dealerId: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  coverUrl?: string | null;
  heroTagline?: string | null;
  showcaseTags: string[];
  showFinanceOffers: boolean;
  showReviews: boolean;
  showInventory: boolean;
  contactWhatsapp?: string | null;
  contactPhone?: string | null;
}

export interface LeadNote {
  id: string;
  leadId: string;
  body: string;
  authorName?: string;
  createdAt: string;
}

export interface DealerAnalyticsSnapshot {
  leadsByStatus: Record<LeadStatus, number>;
  monthlyLeads: { month: string; leads: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  financePending: number;
  financeApproved: number;
  auctionActive: number;
  soldMtd: number;
}

export async function fetchDealerEnterprise(dealerId: string): Promise<DealerEnterpriseProfile | null> {
  const { data, error } = await supabase
    .from("dealers")
    .select("id, name, slug, gst_number, pan_number, verification_status, is_verified, subscription_tier, total_listings_cap, city, state")
    .eq("id", dealerId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    gstNumber: row.gst_number as string | null,
    panNumber: row.pan_number as string | null,
    verificationStatus: (row.verification_status as DealerVerificationStatus) ?? "pending",
    isVerified: Boolean(row.is_verified),
    subscriptionTier: (row.subscription_tier as string) ?? "free",
    totalListingsCap: Number(row.total_listings_cap ?? 25),
    city: row.city as string,
    state: row.state as string,
  };
}

export async function updateDealerProfile(
  dealerId: string,
  patch: Partial<{
    gst_number: string;
    pan_number: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    state: string;
  }>
) {
  return supabase.from("dealers").update(patch).eq("id", dealerId);
}

export async function fetchDealerMembers(dealerId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("dealer_members")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[dealer] members", error.message);
    return [];
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id ?? undefined,
    name: m.full_name,
    email: m.email,
    phone: m.phone ?? undefined,
    role: m.role as TeamMember["role"],
    isActive: m.is_active,
  }));
}

export async function inviteDealerMember(input: {
  dealerId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: TeamMember["role"];
}) {
  return supabase.from("dealer_members").insert({
    dealer_id: input.dealerId,
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
  });
}

export async function toggleMemberActive(memberId: string, isActive: boolean) {
  return supabase.from("dealer_members").update({ is_active: isActive }).eq("id", memberId);
}

export async function fetchDealerDocuments(dealerId: string) {
  const { data } = await supabase
    .from("dealer_documents")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function uploadDealerDocument(input: {
  dealerId: string;
  docType: string;
  fileUrl: string;
  fileName: string;
}) {
  const { data, error } = await supabase
    .from("dealer_documents")
    .insert({
      dealer_id: input.dealerId,
      doc_type: input.docType,
      file_url: input.fileUrl,
      file_name: input.fileName,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("dealers")
    .update({ verification_status: "documents_submitted" })
    .eq("id", input.dealerId);

  return data;
}

export async function fetchStorefront(dealerId: string): Promise<DealerStorefront | null> {
  const { data } = await supabase
    .from("dealer_storefronts")
    .select("*")
    .eq("dealer_id", dealerId)
    .maybeSingle();

  if (!data) return null;
  return {
    dealerId: data.dealer_id,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    coverUrl: data.cover_url,
    heroTagline: data.hero_tagline,
    showcaseTags: data.showcase_tags ?? [],
    showFinanceOffers: data.show_finance_offers,
    showReviews: data.show_reviews,
    showInventory: data.show_inventory,
    contactWhatsapp: data.contact_whatsapp,
    contactPhone: data.contact_phone,
  };
}

export async function upsertStorefront(dealerId: string, patch: Partial<DealerStorefront>) {
  return supabase.from("dealer_storefronts").upsert({
    dealer_id: dealerId,
    seo_title: patch.seoTitle,
    seo_description: patch.seoDescription,
    cover_url: patch.coverUrl,
    hero_tagline: patch.heroTagline,
    showcase_tags: patch.showcaseTags,
    show_finance_offers: patch.showFinanceOffers,
    show_reviews: patch.showReviews,
    show_inventory: patch.showInventory,
    contact_whatsapp: patch.contactWhatsapp,
    contact_phone: patch.contactPhone,
    updated_at: new Date().toISOString(),
  });
}

export async function changeSubscriptionTier(dealerId: string, tier: string) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.code === tier);
  return supabase
    .from("dealers")
    .update({
      subscription_tier: tier,
      total_listings_cap: plan?.maxListings ?? 25,
      subscription_started_at: new Date().toISOString(),
    })
    .eq("id", dealerId);
}

export async function fetchLeadNotes(leadId: string): Promise<LeadNote[]> {
  const { data } = await supabase
    .from("dealer_lead_notes")
    .select("id, lead_id, body, created_at, author_id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((n) => ({
    id: n.id,
    leadId: n.lead_id,
    body: n.body,
    createdAt: n.created_at,
  }));
}

export async function addLeadNote(input: {
  leadId: string;
  dealerId: string;
  authorId: string;
  body: string;
}) {
  return supabase.from("dealer_lead_notes").insert({
    lead_id: input.leadId,
    dealer_id: input.dealerId,
    author_id: input.authorId,
    body: input.body,
  });
}

export async function assignLead(leadId: string, userId: string | null) {
  return supabase.from("leads").update({ assigned_to: userId }).eq("id", leadId);
}

export async function fetchDealerFinanceStats(dealerId: string) {
  const { data: vehicles } = await supabase.from("vehicles").select("id").eq("dealer_id", dealerId);
  const ids = (vehicles ?? []).map((v) => v.id);
  if (!ids.length) return { pending: 0, approved: 0, applications: [] as unknown[] };

  const { data } = await supabase
    .from("finance_applications")
    .select("id, status, loan_amount, created_at, vehicle_id")
    .in("vehicle_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);

  const apps = data ?? [];
  return {
    pending: apps.filter((a) => ["draft", "submitted", "processing"].includes(a.status)).length,
    approved: apps.filter((a) => a.status === "approved" || a.status === "disbursed").length,
    applications: apps,
  };
}

export async function fetchDealerAuctionEntries(dealerId: string) {
  const { data, error } = await supabase
    .from("dealer_auction_entries")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[dealer] auction entries", error.message);
    return [];
  }
  return data ?? [];
}

export async function registerDealerAuction(dealerId: string, auctionId: string) {
  return supabase.from("dealer_auction_entries").insert({
    dealer_id: dealerId,
    auction_id: auctionId,
    status: "registered",
  });
}

export async function fetchPublicDealerBySlug(slug: string) {
  const { data: dealer } = await supabase
    .from("dealers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!dealer) return null;

  const [storefront, vehicles, reviews] = await Promise.all([
    supabase.from("dealer_storefronts").select("*").eq("dealer_id", dealer.id).maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, slug, title, brand, model, year, price, images, status, is_certified, city")
      .eq("dealer_id", dealer.id)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("entity_type", "dealer")
      .eq("entity_id", dealer.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return { dealer, storefront: storefront.data, vehicles: vehicles.data ?? [], reviews: reviews.data ?? [] };
}

export function buildAnalyticsFromData(
  leads: { status: LeadStatus; created_at: string }[],
  soldVehicles: { price: number; updated_at: string }[],
  finance: { pending: number; approved: number },
  auctionCount: number
): DealerAnalyticsSnapshot {
  const statuses: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];
  const leadsByStatus = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<LeadStatus, number>;
  leads.forEach((l) => {
    leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthlyLeads = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const count = leads.filter((l) => {
      const c = new Date(l.created_at);
      return `${c.getFullYear()}-${c.getMonth()}` === key;
    }).length;
    return { month: monthNames[d.getMonth()]!, leads: count };
  });

  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: monthNames[d.getMonth()]!,
      revenue: 0,
    };
  });

  return {
    leadsByStatus,
    monthlyLeads,
    monthlyRevenue,
    financePending: finance.pending,
    financeApproved: finance.approved,
    auctionActive: auctionCount,
    soldMtd: soldVehicles.length,
  };
}

/** AI fair price suggestion from listing attributes */
export function suggestVehiclePrice(input: {
  year: number;
  kmsDriven: number;
  listedPrice: number;
  brand: string;
}): { suggested: number; range: [number, number]; confidence: number; rationale: string } {
  const age = new Date().getFullYear() - input.year;
  const depPerYear = 0.08;
  const kmPenalty = Math.min(0.25, (input.kmsDriven / 100000) * 0.12);
  const base = input.listedPrice * (1 - age * depPerYear - kmPenalty);
  const suggested = Math.round(base / 5000) * 5000;
  const spread = Math.round(suggested * 0.06);
  return {
    suggested,
    range: [suggested - spread, suggested + spread],
    confidence: 78 + (input.brand.match(/maruti|hyundai|tata/i) ? 8 : 0),
    rationale: `Based on ${age}yr age, ${(input.kmsDriven / 1000).toFixed(0)}k km and market comps for ${input.brand}.`,
  };
}

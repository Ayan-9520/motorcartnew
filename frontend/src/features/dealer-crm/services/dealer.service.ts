import { supabase } from "@/integrations/supabase/client";
import type { DbDealer } from "@/types/database";
import type { DealerProfile } from "../types";

export function mapDealer(d: DbDealer): DealerProfile {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    dealerType: d.dealer_type,
    city: d.city,
    state: d.state,
    phone: d.phone ?? undefined,
    rating: Number(d.rating),
    reviewCount: d.review_count,
    isVerified: d.is_verified,
  };
}

export async function fetchDealerByOwner(ownerId: string): Promise<DealerProfile | null> {
  const { data, error } = await supabase
    .from("dealers")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDealer(data as DbDealer);
}

async function seedDealerWorkspace(
  profile: DealerProfile,
  ownerId: string,
  ownerEmail: string,
  ownerName: string
) {
  await supabase.from("dealer_members").upsert(
    {
      dealer_id: profile.id,
      user_id: ownerId,
      email: ownerEmail.toLowerCase(),
      full_name: ownerName,
      role: "owner",
      is_active: true,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "dealer_id,email" }
  );
  await supabase.from("dealer_storefronts").upsert(
    { dealer_id: profile.id, hero_tagline: `Trusted ${profile.city} dealership` },
    { onConflict: "dealer_id" }
  );
}

export async function ensureDealerForUser(
  ownerId: string,
  user: { fullName?: string; email?: string; city?: string; state?: string; role?: string }
): Promise<DealerProfile | null> {
  const existing = await fetchDealerByOwner(ownerId);
  if (existing) {
    await seedDealerWorkspace(
      existing,
      ownerId,
      user.email ?? `${ownerId.slice(0, 8)}@motorcart.local`,
      user.fullName ?? "Owner"
    );
    return existing;
  }

  const slug = `dealer-${ownerId.slice(0, 8)}`;
  const { data, error } = await supabase
    .from("dealers")
    .insert({
      owner_id: ownerId,
      name: user.fullName ? `${user.fullName} Motors` : "My Dealership",
      slug,
      city: user.city ?? "Mumbai",
      state: user.state ?? "Maharashtra",
      dealer_type: user.role ?? "dealer",
    })
    .select()
    .single();

  if (error) return null;
  const profile = mapDealer(data as DbDealer);
  await seedDealerWorkspace(
    profile,
    ownerId,
    user.email ?? `owner-${ownerId.slice(0, 8)}@motorcart.local`,
    user.fullName ?? "Owner"
  );
  return profile;
}

export async function fetchDealerVehiclesByDealerId(dealerId: string) {
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchDealerLeads(dealerId: string) {
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** All leads for every showroom owned by this user (demo + multi-branch). */
export async function fetchLeadsForDealerOwner(ownerId: string) {
  const { data: dealers, error: dealerErr } = await supabase
    .from("dealers")
    .select("id")
    .eq("owner_id", ownerId);

  if (dealerErr || !dealers?.length) return [];

  const ids = dealers.map((d) => (d as { id: string }).id);
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .in("dealer_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[dealer] leads for owner", error.message);
    return [];
  }
  return data ?? [];
}

export async function createInventoryUploadRecord(payload: {
  dealerId: string;
  uploadedBy: string;
  fileName: string;
  totalRows: number;
}) {
  return supabase
    .from("inventory_uploads")
    .insert({
      dealer_id: payload.dealerId,
      uploaded_by: payload.uploadedBy,
      file_url: `local://${payload.fileName}`,
      file_name: payload.fileName,
      status: "processing",
      total_rows: payload.totalRows,
    })
    .select()
    .single();
}

export async function completeInventoryUpload(
  uploadId: string,
  success: number,
  failed: number,
  errorLog: unknown[]
) {
  return supabase
    .from("inventory_uploads")
    .update({
      status: failed === 0 ? "completed" : "failed",
      success_rows: success,
      failed_rows: failed,
      error_log: errorLog,
      completed_at: new Date().toISOString(),
    })
    .eq("id", uploadId);
}

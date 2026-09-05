import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api/axios";
import { featureFlags } from "@/config/feature-flags";
import { hasConfiguredApi } from "@/lib/api/base-url";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDbVehicleId(id: string): boolean {
  return UUID_RE.test(id);
}

async function restWishlistEnabled(): Promise<boolean> {
  return featureFlags.wishlistDb && hasConfiguredApi();
}

export async function fetchWishlistVehicleIds(userId: string): Promise<string[]> {
  if (await restWishlistEnabled()) {
    try {
      const { data } = await api.get<{ vehicleIds?: string[] }>("/api/wishlist");
      return data.vehicleIds ?? [];
    } catch (e) {
      console.warn("[wishlist] fetch api", e);
      return [];
    }
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select("vehicle_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("[wishlist] fetch", error.message);
    return [];
  }
  return (data ?? []).map((r) => (r as { vehicle_id: string }).vehicle_id);
}

export async function addWishlistOnServer(userId: string, vehicleId: string): Promise<void> {
  if (!isDbVehicleId(vehicleId)) return;

  if (await restWishlistEnabled()) {
    try {
      await api.post("/api/wishlist", { vehicle_id: vehicleId });
      return;
    } catch (e) {
      console.warn("[wishlist] add api", e);
      return;
    }
  }

  const { error } = await supabase.from("wishlists").upsert(
    { user_id: userId, vehicle_id: vehicleId },
    { onConflict: "user_id,vehicle_id" }
  );
  if (error) console.warn("[wishlist] add", error.message);
}

export async function removeWishlistOnServer(userId: string, vehicleId: string): Promise<void> {
  if (!isDbVehicleId(vehicleId)) return;

  if (await restWishlistEnabled()) {
    try {
      await api.delete("/api/wishlist", { params: { vehicle_id: vehicleId } });
      return;
    } catch (e) {
      console.warn("[wishlist] remove api", e);
      return;
    }
  }

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("vehicle_id", vehicleId);
  if (error) console.warn("[wishlist] remove", error.message);
}

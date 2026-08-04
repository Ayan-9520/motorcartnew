import { supabase } from "@/integrations/supabase/client";
import type { DbAuction, DbBid } from "@/types/database";
import { MOCK_AUCTIONS, MOCK_BIDS, MOCK_MESSAGES } from "../data/mock-auctions";
import { realDataOnly } from "@/config/real-data";
import { mapDbAuction } from "../lib/auction-utils";
import type {
  AuctionListing,
  AuctionBid,
  AuctionMessage,
  AuctionType,
  AuctionAnalytics,
  AuctionNotification,
  PlaceBidResult,
} from "../types";
import type { AuctionStatus } from "@/types/database";

export async function fetchAuctions(filters?: {
  status?: AuctionStatus;
  type?: AuctionType;
  featured?: boolean;
}): Promise<AuctionListing[]> {
  let q = supabase.from("auctions").select("*").order("ends_at", { ascending: true });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.type) q = q.eq("auction_type", filters.type);
  if (filters?.featured) q = q.eq("is_featured", true);

  const { data, error } = await q;
  if (!error && data?.length) {
    return (data as DbAuction[]).map((a) => mapDbAuction(a));
  }

  if (realDataOnly) return [];

  let pool = [...MOCK_AUCTIONS];
  if (filters?.status) pool = pool.filter((a) => a.status === filters.status);
  if (filters?.type) pool = pool.filter((a) => a.auctionType === filters.type);
  if (filters?.featured) pool = pool.filter((a) => a.isFeatured);
  return pool;
}

export async function fetchAuctionBySlug(slug: string): Promise<AuctionListing | null> {
  const { data } = await supabase.from("auctions").select("*").eq("slug", slug).maybeSingle();
  if (data) return mapDbAuction(data as DbAuction);

  if (realDataOnly) return null;
  return MOCK_AUCTIONS.find((a) => a.slug === slug) ?? null;
}

export async function fetchAuctionBids(auctionId: string): Promise<AuctionBid[]> {
  const { data } = await supabase
    .from("bids")
    .select("*, users(full_name)")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (data?.length) {
    return data.map((b) => {
      const row = b as DbBid & { users?: { full_name: string } };
      return {
        id: row.id,
        auctionId: row.auction_id,
        bidderId: row.bidder_id,
        bidderName: row.users?.full_name ?? "Bidder",
        amount: Number(row.amount),
        isAutoBid: row.is_auto_bid,
        createdAt: row.created_at,
      };
    });
  }

  if (realDataOnly) return [];
  return MOCK_BIDS[auctionId] ?? [];
}

export async function fetchAuctionMessages(auctionId: string): Promise<AuctionMessage[]> {
  const { data } = await supabase
    .from("auction_messages")
    .select("*")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (data?.length) {
    return data.map((m) => ({
      id: m.id,
      auctionId: m.auction_id,
      userId: m.user_id,
      displayName: m.display_name,
      message: m.message,
      isSystem: m.is_system,
      createdAt: m.created_at,
    }));
  }

  if (realDataOnly) return [];
  return MOCK_MESSAGES[auctionId] ?? [];
}

export async function placeBidRpc(
  auctionId: string,
  amount: number,
  isAutoBid = false
): Promise<PlaceBidResult> {
  const { data, error } = await supabase.rpc("place_auction_bid", {
    p_auction_id: auctionId,
    p_amount: amount,
    p_is_auto_bid: isAutoBid,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as {
    ok: boolean;
    error?: string;
    bid_id?: string;
    amount?: number;
    bidder_name?: string;
    extended?: boolean;
  };
  return {
    ok: result.ok,
    error: result.error,
    bidId: result.bid_id,
    amount: result.amount,
    bidderName: result.bidder_name,
    extended: result.extended,
  };
}

export async function finalizeAuctionRpc(auctionId: string) {
  const { data, error } = await supabase.rpc("finalize_auction", { p_auction_id: auctionId });
  if (error) return { ok: false, error: error.message };
  return data as {
    ok: boolean;
    error?: string;
    winner_id?: string;
    winning_amount?: number;
    reserve_met?: boolean;
  };
}

export async function registerDealerAuctionRpc(auctionId: string, maxBid?: number) {
  const { data, error } = await supabase.rpc("register_dealer_auction", {
    p_auction_id: auctionId,
    p_max_bid: maxBid ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; error?: string; entry_id?: string };
}

export async function fetchAuctionNotifications(
  auctionId: string,
  userId: string
): Promise<AuctionNotification[]> {
  const { data } = await supabase
    .from("auction_notifications")
    .select("*")
    .eq("auction_id", auctionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data?.length) return [];
  return data.map((row) => ({
    id: row.id,
    auctionId: row.auction_id,
    userId: row.user_id,
    kind: row.kind as AuctionNotification["kind"],
    title: row.title,
    body: row.body,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function setAutoBidRpc(auctionId: string, maxAmount: number) {
  const { data, error } = await supabase.rpc("set_auction_auto_bid", {
    p_auction_id: auctionId,
    p_max_amount: maxAmount,
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; error?: string };
}

export async function sendChatMessage(auctionId: string, message: string, displayName: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Login required" };
  return supabase.from("auction_messages").insert({
    auction_id: auctionId,
    user_id: user.id,
    display_name: displayName,
    message,
  });
}

export async function updateAuctionAdmin(
  auctionId: string,
  updates: Partial<{
    status: AuctionStatus;
    ends_at: string;
    is_featured: boolean;
  }>
) {
  return supabase.from("auctions").update(updates).eq("id", auctionId).select().single();
}

export async function createAuction(payload: Record<string, unknown>) {
  return supabase.from("auctions").insert(payload).select().single();
}

export function getAuctionAnalytics(auctions: AuctionListing[]): AuctionAnalytics {
  const live = auctions.filter((a) => a.status === "live");
  const ended = auctions.filter((a) => a.status === "ended");
  const totalBids = auctions.reduce((s, a) => s + a.bidCount, 0);
  const revenue = ended.reduce((s, a) => s + (a.currentBid ?? 0), 0);
  const reserveMet = ended.filter((a) => !a.reservePrice || (a.currentBid ?? 0) >= a.reservePrice).length;

  return {
    totalAuctions: auctions.length,
    liveCount: live.length,
    totalBids,
    totalRevenue: revenue,
    avgBidsPerAuction: auctions.length ? Math.round(totalBids / auctions.length) : 0,
    reserveMetRate: ended.length ? Math.round((reserveMet / ended.length) * 100) : 0,
  };
}

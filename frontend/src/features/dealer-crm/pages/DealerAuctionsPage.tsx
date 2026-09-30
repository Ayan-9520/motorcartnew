import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { AuctionDesk } from "../components/AuctionDesk";
import { useDealer } from "../hooks/useDealer";
import { fetchDealerAuctionEntries, registerDealerAuction } from "../services/dealer-enterprise.service";
import { fetchDealerVehiclesByDealerId } from "../services/dealer.service";
import {
  fetchMyAuctionActivity,
  type MyAuctionBid,
  type MyAuctionLot,
} from "@/features/auctions/services/auction.service";
import type { AuctionVehicleOption } from "@/features/auctions/components/AuctionLotForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

export function DealerAuctionsPage() {
  const { dealer, loading } = useDealer();
  const userId = useAuthStore((s) => s.user?.id);
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<
    { id: string; title: string; status: string; current_bid: number | null }[]
  >([]);
  const [myBids, setMyBids] = useState<MyAuctionBid[]>([]);
  const [myLots, setMyLots] = useState<MyAuctionLot[]>([]);
  const [vehicles, setVehicles] = useState<AuctionVehicleOption[]>([]);

  const load = useCallback(async () => {
    if (!dealer) return;
    const [entryRows, auctionRes, activity, stock] = await Promise.all([
      fetchDealerAuctionEntries(dealer.id),
      supabase
        .from("auctions")
        .select("id, title, status, current_bid")
        .in("status", ["live", "upcoming"])
        .order("ends_at", { ascending: true })
        .limit(24),
      fetchMyAuctionActivity(),
      fetchDealerVehiclesByDealerId(dealer.id, userId),
    ]);
    setEntries(entryRows);
    setLiveAuctions((auctionRes.data ?? []) as typeof liveAuctions);
    setMyBids(activity.bids);
    setMyLots(activity.organised);
    const inAuction = new Set(
      activity.organised
        .filter((l) => l.status === "pending" || l.status === "upcoming" || l.status === "live")
        .map((l) => String(l.vehicle_id ?? ""))
    );
    setVehicles(
      (stock as Record<string, unknown>[])
        .filter((v) => (v.status ?? "available") === "available" && !inAuction.has(String(v.id)))
        .map((v) => ({
          id: String(v.id),
          title: String(v.title ?? [v.year, v.brand, v.model].filter(Boolean).join(" ")),
          price: Number(v.price ?? 0),
          city: v.city ? String(v.city) : undefined,
        }))
    );
  }, [dealer, userId]);

  useEffect(() => {
    setPageMeta({ title: "Auction desk" });
    void load();
  }, [load]);

  const join = async (auctionId: string) => {
    if (!dealer) return;
    try {
      await registerDealerAuction(dealer.id, auctionId);
      toast.success("Registered for auction");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not register");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading auction desk…</p>;

  return (
    <DealerConsoleShell
      title="Auction management"
      description="Bid on bank, fleet & dealer lots — or put your own stock up for auction."
      crumbs={[{ label: "Auctions" }]}
      actions={
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link to="/auctions">Public auction hub</Link>
        </Button>
      }
    >
      <AuctionDesk
        liveAuctions={liveAuctions.map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status,
          currentBid: a.current_bid,
        }))}
        registrations={entries}
        onRegister={join}
        myBids={myBids}
        myLots={myLots}
        sellableVehicles={vehicles}
        onRefresh={() => void load()}
      />
    </DealerConsoleShell>
  );
}

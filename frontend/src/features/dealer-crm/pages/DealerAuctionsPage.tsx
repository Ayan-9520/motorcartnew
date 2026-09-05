import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { AuctionDesk } from "../components/AuctionDesk";
import { useDealer } from "../hooks/useDealer";
import { fetchDealerAuctionEntries, registerDealerAuction } from "../services/dealer-enterprise.service";
import { supabase } from "@/integrations/supabase/client";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

export function DealerAuctionsPage() {
  const { dealer, loading } = useDealer();
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<
    { id: string; title: string; status: string; current_bid: number | null }[]
  >([]);

  const load = async () => {
    if (!dealer) return;
    setEntries(await fetchDealerAuctionEntries(dealer.id));
    const { data } = await supabase
      .from("auctions")
      .select("id, title, status, current_bid")
      .in("status", ["live", "upcoming"])
      .limit(12);
    setLiveAuctions((data ?? []) as typeof liveAuctions);
  };

  useEffect(() => {
    setPageMeta({ title: "Auction desk" });
    void load();
  }, [dealer]);

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
      description="My bids, auction lots, won auctions and auto-bid — fleet & repo inventory."
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
      />
    </DealerConsoleShell>
  );
}

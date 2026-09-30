import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, Zap, Trophy, Radio, Store } from "lucide-react";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { auctionDetailPath } from "@/features/auctions/lib/auction-utils";
import { AuctionLotForm, type AuctionVehicleOption } from "@/features/auctions/components/AuctionLotForm";
import {
  setAutoBidRpc,
  type MyAuctionBid,
  type MyAuctionLot,
} from "@/features/auctions/services/auction.service";
import { cn } from "@/lib/utils";

export type AuctionLot = {
  id: string;
  title: string;
  status: string;
  currentBid: number | null;
  startingBid?: number;
  endsAt?: string;
};

type AuctionDeskProps = {
  liveAuctions: AuctionLot[];
  registrations: Record<string, unknown>[];
  onRegister: (auctionId: string) => void;
  myBids: MyAuctionBid[];
  myLots: MyAuctionLot[];
  sellableVehicles: AuctionVehicleOption[];
  onRefresh: () => void;
};

const LOT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting approval",
  upcoming: "Scheduled",
  live: "Live",
  ended: "Ended",
  cancelled: "Rejected / cancelled",
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function AuctionDesk({
  liveAuctions,
  registrations,
  onRegister,
  myBids,
  myLots,
  sellableVehicles,
  onRefresh,
}: AuctionDeskProps) {
  const [autoBidLot, setAutoBidLot] = useState<string | null>(null);
  const [autoMax, setAutoMax] = useState("");
  const [savingAuto, setSavingAuto] = useState(false);

  const won = useMemo(() => myBids.filter((b) => b.standing === "won"), [myBids]);
  const myActive = useMemo(
    () => myBids.filter((b) => b.status === "live" || b.status === "upcoming"),
    [myBids]
  );
  const lotTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of liveAuctions) map.set(a.id, a.title);
    for (const b of myBids) map.set(b.id, b.title);
    return map;
  }, [liveAuctions, myBids]);

  const enableAutoBid = async () => {
    const max = Number(autoMax.replace(/[^\d]/g, ""));
    if (!autoBidLot || !max) return;
    setSavingAuto(true);
    const r = await setAutoBidRpc(autoBidLot, max);
    setSavingAuto(false);
    if (!r?.ok) {
      toast.error(r?.error ?? "Could not set auto-bid");
      return;
    }
    toast.success(`Auto-bid set up to ${formatCurrency(max)}`);
    setAutoBidLot(null);
    setAutoMax("");
    onRefresh();
  };

  return (
    <Tabs defaultValue="live" className="space-y-4">
      <TabsList className="dealer-auction-tabs">
        <TabsTrigger value="bids" className="gap-1.5">
          <Gavel className="h-4 w-4" /> My bids
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {myActive.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="live" className="gap-1.5">
          <Radio className="h-4 w-4" /> Live auctions
        </TabsTrigger>
        <TabsTrigger value="won" className="gap-1.5">
          <Trophy className="h-4 w-4" /> Won
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {won.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="auto" className="gap-1.5">
          <Zap className="h-4 w-4" /> Auto-bid
        </TabsTrigger>
        <TabsTrigger value="sell" className="gap-1.5">
          <Store className="h-4 w-4" /> Sell via auction
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bids">
        <div className="dealer-auction-grid">
          {myActive.map((b) => (
            <article key={b.id} className="dealer-auction-lot">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-snug">{b.title}</p>
                <span
                  className={cn(
                    "dealer-os-pill",
                    b.standing === "leading" && "bg-primary/15 text-primary",
                    b.standing === "outbid" && "bg-destructive/10 text-destructive"
                  )}
                >
                  {b.standing}
                </span>
              </div>
              <p className="text-lg font-bold text-primary mt-2">{formatCurrency(b.my_bid)}</p>
              <p className="text-xs text-muted-foreground">
                Current {formatCurrency(b.current_bid ?? b.start_price)} · ends {shortDate(b.ends_at)}
              </p>
              {b.auto_bid_max != null && (
                <p className="text-xs text-muted-foreground">Auto-bid cap: {formatCurrency(b.auto_bid_max)}</p>
              )}
              <Button size="sm" className="mt-3 w-full" variant="outline" asChild>
                <Link to={auctionDetailPath({ id: b.id, slug: b.slug, status: b.status })}>Open lot room</Link>
              </Button>
            </article>
          ))}
          {!myActive.length && (
            <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
              No active bids. Open a live lot and place your first bid.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="live">
        <div className="dealer-auction-grid">
          {liveAuctions.map((a) => (
            <article key={a.id} className="dealer-auction-lot">
              <p className="font-medium text-sm">{a.title}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">{a.status}</p>
              {a.currentBid != null && (
                <p className="text-sm font-semibold text-primary mt-2">{formatCurrency(a.currentBid)}</p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onRegister(a.id)}>
                  Register
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to={auctionDetailPath({ id: a.id, status: a.status })}>Bid</Link>
                </Button>
              </div>
            </article>
          ))}
          {!liveAuctions.length && (
            <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
              No live auctions — check back or browse the public hub.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="won">
        <table className="dealer-os-table">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Winning bid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {won.map((b) => (
              <tr key={b.id}>
                <td className="font-medium max-w-xs truncate">{b.title}</td>
                <td>{formatCurrency(b.my_bid)}</td>
                <td>
                  <Badge className="bg-primary/15 text-primary border-0">Won — team will call</Badge>
                </td>
              </tr>
            ))}
            {!won.length && (
              <tr>
                <td colSpan={3} className="text-center text-muted-foreground py-8">
                  No won auctions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TabsContent>

      <TabsContent value="auto">
        <div className="dealer-os-card max-w-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Auto-bid engine
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set a maximum bid — Motorcart bids the minimum needed for you until your cap is reached.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <Label>Select lot</Label>
              <select
                className="dealer-os-select mt-1"
                value={autoBidLot ?? ""}
                onChange={(e) => setAutoBidLot(e.target.value || null)}
              >
                <option value="">Choose auction</option>
                {liveAuctions
                  .filter((a) => a.status === "live")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>Maximum bid (₹)</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                placeholder="e.g. 1150000"
                value={autoMax}
                onChange={(e) => setAutoMax(e.target.value)}
              />
            </div>
            <Button type="button" disabled={!autoBidLot || !autoMax || savingAuto} onClick={() => void enableAutoBid()}>
              {savingAuto ? "Saving…" : "Enable auto-bid"}
            </Button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {myBids
            .filter((b) => b.auto_bid_max != null && (b.status === "live" || b.status === "upcoming"))
            .map((b) => (
              <li key={b.id} className="dealer-notification-row">
                <span className="text-sm font-medium">{b.title}</span>
                <span className="text-sm text-primary">Cap {formatCurrency(b.auto_bid_max!)}</span>
              </li>
            ))}
        </ul>
      </TabsContent>

      <TabsContent value="sell" className="space-y-4">
        <div className="dealer-os-card">
          <h3 className="font-semibold">Put a vehicle up for auction</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Motorcart reviews every lot before it goes live. Bidding opens at the scheduled time and the vehicle is
            sold only if the reserve price is met.
          </p>
          {sellableVehicles.length ? (
            <AuctionLotForm mode="seller" vehicles={sellableVehicles} onCreated={onRefresh} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No available vehicles in your inventory.{" "}
              <Link to="/dashboard/dealer/inventory" className="text-primary hover:underline">
                Add a vehicle
              </Link>{" "}
              first.
            </p>
          )}
        </div>
        {myLots.length > 0 && (
          <section className="dealer-os-card">
            <h3 className="text-sm font-semibold mb-2">My auction lots</h3>
            <ul className="space-y-2">
              {myLots.map((l) => (
                <li key={l.id} className="dealer-auction-row">
                  <span className="min-w-0">
                    {l.status === "pending" || l.status === "cancelled" ? (
                      <span className="font-medium">{l.title}</span>
                    ) : (
                      <Link
                        to={auctionDetailPath({ id: l.id, slug: l.slug, status: l.status })}
                        className="font-medium hover:text-primary"
                      >
                        {l.title}
                      </Link>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {l.status === "ended"
                        ? l.winner_id
                          ? `Sold at ${formatCurrency(l.current_bid ?? 0)}`
                          : l.bid_count
                            ? `Reserve not met (top bid ${formatCurrency(l.current_bid ?? 0)})`
                            : "No bids"
                        : `${formatCurrency(l.current_bid ?? l.start_price)} · ${l.bid_count} bids · ${shortDate(l.starts_at)} → ${shortDate(l.ends_at)}`}
                    </span>
                  </span>
                  <span className="dealer-os-pill">{LOT_STATUS_LABEL[l.status] ?? l.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </TabsContent>

      {registrations.length > 0 && (
        <section className="dealer-os-card mt-2">
          <h3 className="text-sm font-semibold mb-2">Your registrations</h3>
          <ul className="space-y-2">
            {registrations.map((e) => (
              <li key={e.id as string} className="dealer-auction-row">
                <span>{lotTitle.get(String(e.auction_id)) ?? "Auction"}</span>
                <span className="dealer-os-pill">{String(e.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Tabs>
  );
}

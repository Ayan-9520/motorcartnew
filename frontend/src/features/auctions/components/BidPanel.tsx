import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gavel, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { AuctionListing } from "../types";

interface BidPanelProps {
  auction: AuctionListing;
  minBid: number;
  placing: boolean;
  bidLocked?: boolean;
  onPlaceBid: (amount: number) => Promise<{ ok: boolean }>;
  onSetAutoBid: (max: number) => Promise<void>;
  isAuthenticated: boolean;
}

export function BidPanel({
  auction,
  minBid,
  placing,
  bidLocked = false,
  onPlaceBid,
  onSetAutoBid,
  isAuthenticated,
}: BidPanelProps) {
  const location = useLocation();
  const [amount, setAmount] = useState(minBid);
  const [autoMax, setAutoMax] = useState(minBid + auction.bidIncrement * 5);
  const [showAuto, setShowAuto] = useState(false);

  useEffect(() => {
    setAmount(minBid);
    setAutoMax(minBid + auction.bidIncrement * 5);
  }, [minBid, auction.bidIncrement]);

  const quickBids = [
    minBid,
    minBid + auction.bidIncrement,
    minBid + auction.bidIncrement * 2,
    minBid + auction.bidIncrement * 5,
  ];

  if (auction.status !== "live") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {auction.status === "upcoming" ? (
            <>
              Bidding opens{" "}
              <strong className="text-foreground">
                {new Date(auction.startsAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </strong>
              <br />
              <span className="text-xs">Starting bid {formatCurrency(auction.startingBid)}</span>
            </>
          ) : auction.status === "pending" ? (
            "Awaiting admin approval — bidding opens once approved"
          ) : auction.status === "cancelled" ? (
            "This auction was cancelled"
          ) : (
            "This auction has ended"
          )}
        </CardContent>
      </Card>
    );
  }

  const locked = placing || bidLocked;

  return (
    <Card className="auc-bid-panel border-primary/20 shadow-wa">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gavel className="h-5 w-5 text-primary" />
          Place your bid
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <article className="rounded-xl bg-accent/40 p-4 text-center dark:bg-[#005c4b]/20">
          <p className="text-xs text-muted-foreground">
            {auction.bidCount > 0 && auction.currentBid != null ? "Current bid" : "Starting bid"}
          </p>
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(auction.currentBid ?? auction.startingBid)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Min next bid: <strong>{formatCurrency(minBid)}</strong> (+{formatCurrency(auction.bidIncrement)} increment)
          </p>
        </article>

        <div className="flex flex-wrap gap-2">
          {quickBids.map((q) => (
            <Button key={q} type="button" variant="outline" size="sm" onClick={() => setAmount(q)}>
              {formatCurrency(q)}
            </Button>
          ))}
        </div>

        <div>
          <Label>Your bid (₹)</Label>
          <Input
            type="number"
            className="mt-1 text-lg font-semibold"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={minBid}
            step={auction.bidIncrement}
          />
        </div>

        {locked && (
          <p className="text-center text-xs text-amber-600 font-medium">Bid lock active — syncing with exchange</p>
        )}

        <Button
          variant="default"
          className="w-full gap-2 h-12 text-base"
          disabled={!isAuthenticated || locked || amount < minBid}
          onClick={() => onPlaceBid(amount)}
        >
          {locked ? "Processing bid…" : <><Gavel className="h-5 w-5" /> Confirm Bid</>}
        </Button>

        {!isAuthenticated && (
          <p className="text-center text-sm text-muted-foreground">
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="font-semibold text-primary hover:underline"
            >
              Login
            </Link>{" "}
            to bid
          </p>
        )}

        <Button type="button" variant="ghost" className="w-full gap-1 text-sm" onClick={() => setShowAuto(!showAuto)}>
          <Zap className="h-4 w-4" /> Auto-bid {showAuto ? "▲" : "▼"}
        </Button>

        {showAuto && (
          <aside className="space-y-2 rounded-lg border p-3 bg-background">
            <Label>Max auto-bid (₹)</Label>
            <Input type="number" value={autoMax} onChange={(e) => setAutoMax(Number(e.target.value))} />
            <Button variant="outline" size="sm" className="w-full" onClick={() => onSetAutoBid(autoMax)}>
              <TrendingUp className="h-4 w-4 mr-1" /> Activate auto-bid
            </Button>
          </aside>
        )}
      </CardContent>
    </Card>
  );
}

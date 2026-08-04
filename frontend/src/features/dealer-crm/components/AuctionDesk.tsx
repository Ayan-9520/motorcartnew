import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, Zap, Trophy, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { auctionDetailPath } from "@/features/auctions/lib/auction-utils";
import { cn } from "@/lib/utils";

export type AuctionLot = {
  id: string;
  title: string;
  status: string;
  currentBid: number | null;
  startingBid?: number;
  endsAt?: string;
};

export type DealerBid = {
  id: string;
  auctionId: string;
  title: string;
  myBid: number;
  status: "leading" | "outbid" | "won" | "registered";
  autoBidMax?: number;
};

type AuctionDeskProps = {
  liveAuctions: AuctionLot[];
  registrations: Record<string, unknown>[];
  onRegister: (auctionId: string) => void;
};

const DEMO_BIDS: DealerBid[] = [
  { id: "b1", auctionId: "a1", title: "2021 Hyundai Creta Diesel — Fleet lot (12 units)", myBid: 9_85_000, status: "leading", autoBidMax: 10_50_000 },
  { id: "b2", auctionId: "a2", title: "Tata Nexon EV — Bank repo single unit", myBid: 11_20_000, status: "outbid", autoBidMax: 11_80_000 },
  { id: "b3", auctionId: "a3", title: "Maruti Swift batch — Chennai yard", myBid: 4_65_000, status: "won" },
];

export function AuctionDesk({ liveAuctions, registrations, onRegister }: AuctionDeskProps) {
  const [autoBidLot, setAutoBidLot] = useState<string | null>(null);
  const [autoMax, setAutoMax] = useState("1150000");
  const [bids, setBids] = useState(DEMO_BIDS);

  const won = useMemo(() => bids.filter((b) => b.status === "won"), [bids]);
  const myActive = useMemo(() => bids.filter((b) => b.status !== "won"), [bids]);

  const enableAutoBid = () => {
    if (!autoBidLot) return;
    setBids((prev) =>
      prev.map((b) =>
        b.auctionId === autoBidLot ? { ...b, autoBidMax: Number(autoMax), status: "leading" as const } : b
      )
    );
    setAutoBidLot(null);
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
                    b.status === "leading" && "bg-primary/15 text-primary",
                    b.status === "outbid" && "bg-destructive/10 text-destructive"
                  )}
                >
                  {b.status}
                </span>
              </div>
              <p className="text-lg font-bold text-primary mt-2">{formatCurrency(b.myBid)}</p>
              {b.autoBidMax && (
                <p className="text-xs text-muted-foreground">Auto-bid cap: {formatCurrency(b.autoBidMax)}</p>
              )}
              <Button size="sm" className="mt-3 w-full" variant="outline" asChild>
                <Link to={auctionDetailPath({ id: b.auctionId, status: "live" })}>Open lot room</Link>
              </Button>
            </article>
          ))}
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
                <td>{formatCurrency(b.myBid)}</td>
                <td>
                  <Badge className="bg-primary/15 text-primary border-0">Won</Badge>
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
            Set a maximum bid — Motorcart increments automatically until your cap on live lots.
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
                {myActive.map((b) => (
                  <option key={b.auctionId} value={b.auctionId}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Maximum bid (₹)</Label>
              <Input className="mt-1" value={autoMax} onChange={(e) => setAutoMax(e.target.value)} />
            </div>
            <Button type="button" disabled={!autoBidLot} onClick={enableAutoBid}>
              Enable auto-bid
            </Button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {bids
            .filter((b) => b.autoBidMax)
            .map((b) => (
              <li key={b.id} className="dealer-notification-row">
                <span className="text-sm font-medium">{b.title}</span>
                <span className="text-sm text-primary">Cap {formatCurrency(b.autoBidMax!)}</span>
              </li>
            ))}
        </ul>
      </TabsContent>

      {registrations.length > 0 && (
        <section className="dealer-os-card mt-2">
          <h3 className="text-sm font-semibold mb-2">Your registrations</h3>
          <ul className="space-y-2">
            {registrations.map((e) => {
              const auction = e.auctions as { title?: string; status?: string } | null;
              return (
                <li key={e.id as string} className="dealer-auction-row">
                  <span>{auction?.title ?? "Auction"}</span>
                  <span className="dealer-os-pill">{String(e.status)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Tabs>
  );
}

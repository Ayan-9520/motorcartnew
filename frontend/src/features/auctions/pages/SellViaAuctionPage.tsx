import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Camera, Gavel, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { AuctionLotForm, type AuctionVehicleOption } from "../components/AuctionLotForm";
import { fetchMyAuctionActivity, type MyAuctionLot } from "../services/auction.service";
import { auctionDetailPath } from "../lib/auction-utils";

const STEPS = [
  { icon: Camera, title: "Submit", body: "Add photos, details and your minimum (reserve) price." },
  { icon: BadgeCheck, title: "Review", body: "Motorcart checks the lot and approves it — usually same day." },
  { icon: Gavel, title: "Live bidding", body: "Verified buyers and dealers bid online until the timer ends." },
  { icon: Handshake, title: "Sold", body: "If the reserve is met, our team connects you with the winner for paperwork & payment." },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting approval",
  upcoming: "Scheduled",
  live: "Live",
  ended: "Ended",
  cancelled: "Not approved",
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function SellViaAuctionPage() {
  const user = useAuthStore((s) => s.user);
  const [vehicles, setVehicles] = useState<AuctionVehicleOption[]>([]);
  const [lots, setLots] = useState<MyAuctionLot[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [{ data }, activity] = await Promise.all([
      supabase.from("vehicles").select("id, title, price, city, status").eq("seller_id", user.id),
      fetchMyAuctionActivity(),
    ]);
    setLots(activity.organised);
    const busy = new Set(
      activity.organised
        .filter((l) => l.status === "pending" || l.status === "upcoming" || l.status === "live")
        .map((l) => String(l.vehicle_id ?? ""))
    );
    setVehicles(
      ((data ?? []) as { id: string; title: string; price: number; city?: string; status?: string }[])
        .filter((v) => (v.status ?? "available") === "available" && !busy.has(String(v.id)))
        .map((v) => ({ id: String(v.id), title: v.title, price: Number(v.price ?? 0), city: v.city ?? undefined }))
    );
  }, [user?.id]);

  useEffect(() => {
    setPageMeta({
      title: "Sell your vehicle via auction | Motorcart",
      description: "List your car, bike or commercial vehicle for online auction. Set a reserve price, get verified bids.",
    });
    void load();
  }, [load]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link to="/auctions">
          <ArrowLeft className="h-4 w-4" /> Auctions
        </Link>
      </Button>

      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sell your vehicle via auction</h1>
        <p className="mt-1 text-muted-foreground">
          Let buyers compete for your vehicle. You set the minimum price — it only sells if bids reach it.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-xl border bg-card p-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              {i + 1}. {title}
            </span>
            <p className="mt-2 text-xs text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>

      {lots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My auction lots</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {lots.map((l) => {
                const publicLot = l.status !== "pending" && l.status !== "cancelled";
                const reviewNote = l.metadata?.review_note ? String(l.metadata.review_note) : "";
                return (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      {publicLot ? (
                        <Link to={auctionDetailPath({ id: l.id, slug: l.slug, status: l.status })} className="font-medium hover:text-primary">
                          {l.title}
                        </Link>
                      ) : (
                        <p className="font-medium">{l.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {l.status === "ended"
                          ? l.winner_id
                            ? `Sold at ${formatCurrency(l.current_bid ?? 0)} — our team will call you`
                            : l.bid_count
                              ? `Reserve not met (top bid ${formatCurrency(l.current_bid ?? 0)})`
                              : "No bids"
                          : `${formatCurrency(l.current_bid ?? l.start_price)} · ${l.bid_count} bids · ${shortDate(l.starts_at)} → ${shortDate(l.ends_at)}`}
                        {l.status === "cancelled" && reviewNote ? ` · ${reviewNote}` : ""}
                      </p>
                    </div>
                    <Badge variant={l.status === "live" ? "default" : "outline"}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New auction lot</CardTitle>
        </CardHeader>
        <CardContent>
          <AuctionLotForm mode="seller" vehicles={vehicles} onCreated={() => void load()} />
        </CardContent>
      </Card>
    </div>
  );
}

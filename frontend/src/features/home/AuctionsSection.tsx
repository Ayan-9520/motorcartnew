import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Gavel, MapPin, Users } from "lucide-react";
import { liveAuctions } from "@/data/mock";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function AuctionsSection() {
  const { auctions } = useHomePage();
  const list = auctions.length ? auctions : liveAuctions;
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Live now"
          title="Live auctions — cars, bikes & commercial"
          description="Dealer inventory, bank repo & fleet disposals. Transparent bidding with AI fair-value for bankers and buyers."
          href="/auctions"
          linkLabel="All auctions"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((auction, index) => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
            >
              <Card className="group overflow-hidden hover:shadow-card-hover">
                <div className="relative aspect-[16/11] bg-muted">
                  <img
                    src={auction.image}
                    alt={auction.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <Badge className="absolute left-2 top-2 gap-1 border-0 bg-red-600 px-1.5 py-0 text-[10px] text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </Badge>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-white/20 bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Clock className="h-3 w-3 text-primary" />
                    {formatTimeLeft(auction.endsAt)}
                  </div>
                </div>
                <CardContent className="space-y-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold">{auction.title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {auction.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {auction.bidCount} bids
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Current bid</p>
                      <p className="text-base font-bold text-primary">
                        {formatCurrency(auction.currentBid)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Start {formatCurrency(auction.startingBid)}
                      </p>
                    </div>
                    <Button variant="default" size="sm" className="h-8 shrink-0 px-2.5 text-xs" asChild>
                      <Link
                        to={
                          "slug" in auction && typeof auction.slug === "string"
                            ? `/auctions/${auction.slug}`
                            : "/auctions"
                        }
                      >
                        <Gavel className="h-3.5 w-3.5" />
                        Bid
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

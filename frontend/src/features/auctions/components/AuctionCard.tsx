import { Link } from "react-router-dom";
import { Gavel, MapPin, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./CountdownTimer";
import { formatCurrency } from "@/lib/utils";
import { auctionDetailPath, isReserveMet } from "../lib/auction-utils";
import { AUCTION_TYPE_LABELS } from "../types";
import type { AuctionListing } from "../types";
import { cn } from "@/lib/utils";
import { resolveAuctionImages } from "@/lib/media/resolve-images";

interface AuctionCardProps {
  auction: AuctionListing;
  index?: number;
}

export function AuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const path = auctionDetailPath(auction);
  const reserveOk = isReserveMet(auction);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="group overflow-hidden hover:shadow-card-hover border-border/80">
        <Link to={path} className="block">
          <figure className="relative aspect-[16/10] bg-muted overflow-hidden">
            <img
              src={resolveAuctionImages(auction.title, auction.images)[0]}
              alt={auction.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/40" />
            {auction.status === "live" && (
              <Badge className="absolute left-3 top-3 gap-1 border-0 bg-red-600 text-white shadow-lg">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                LIVE
              </Badge>
            )}
            {auction.status === "upcoming" && (
              <Badge className="absolute left-3 top-3 bg-amber-500 text-white border-0">
                STARTS {new Date(auction.startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </Badge>
            )}
            {auction.status === "ended" && (
              <Badge className="absolute left-3 top-3 bg-muted-foreground text-white border-0">ENDED</Badge>
            )}
            <Badge variant="outline" className="absolute right-3 top-3 border-white/30 bg-black/40 text-white text-[10px]">
              {AUCTION_TYPE_LABELS[auction.auctionType]}
            </Badge>
            {auction.status === "live" && (
              <span className="absolute bottom-3 right-3">
                <CountdownTimer endsAt={auction.endsAt} />
              </span>
            )}
          </figure>
          <CardContent className="space-y-3 p-4">
            <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">{auction.title}</h3>
            <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{auction.location}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{auction.bidCount} bids</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{auction.viewerCount} watching</span>
            </p>
            <footer className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {auction.bidCount > 0 && auction.currentBid != null ? "Current bid" : "Starting bid"}
                </p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(auction.currentBid ?? auction.startingBid)}
                </p>
                {auction.reservePrice != null && (
                  <p className={cn("flex items-center gap-1 text-[10px]", reserveOk ? "text-primary" : "text-amber-600")}>
                    <Shield className="h-3 w-3" />
                    Reserve {reserveOk ? "met" : `₹${(auction.reservePrice / 100000).toFixed(1)}L`}
                  </p>
                )}
              </div>
              {auction.status === "live" && (
                <Button variant="default" size="sm" className="shrink-0 gap-1" onClick={(e) => e.preventDefault()} asChild>
                  <span><Gavel className="h-4 w-4" />Bid</span>
                </Button>
              )}
            </footer>
          </CardContent>
        </Link>
      </Card>
    </motion.article>
  );
}

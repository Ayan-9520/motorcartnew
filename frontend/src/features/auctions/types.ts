import type { AuctionStatus } from "@/types/database";

export type AuctionType = "dealer" | "bank_repo" | "government" | "insurance" | "fleet";

export const AUCTION_TYPE_LABELS: Record<AuctionType, string> = {
  dealer: "Dealer Auction",
  bank_repo: "Bank Repo",
  government: "Government Auction",
  insurance: "Insurance Salvage",
  fleet: "Fleet Auction",
};

/** UI auction type ↔ `auctions.auction_category` column. */
export const AUCTION_TYPE_TO_CATEGORY: Record<AuctionType, string> = {
  dealer: "dealer",
  bank_repo: "bank",
  government: "government",
  insurance: "insurance",
  fleet: "fleet",
};

export interface AuctionListing {
  id: string;
  slug: string;
  vehicleId: string;
  organizerId: string;
  title: string;
  images: string[];
  startingBid: number;
  currentBid: number | null;
  reservePrice: number | null;
  bidIncrement: number;
  bidCount: number;
  auctionType: AuctionType;
  location: string;
  startsAt: string;
  endsAt: string;
  status: AuctionStatus;
  winnerId: string | null;
  isFeatured: boolean;
  viewerCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName?: string;
  amount: number;
  isAutoBid: boolean;
  createdAt: string;
}

export interface AuctionMessage {
  id: string;
  auctionId: string;
  userId: string | null;
  displayName: string;
  message: string;
  isSystem: boolean;
  createdAt: string;
}

export interface AutoBidConfig {
  auctionId: string;
  maxAmount: number;
  isActive: boolean;
}

export interface BidValidationResult {
  valid: boolean;
  minBid: number;
  error?: string;
  riskScore?: number;
}

export interface AuctionAnalytics {
  totalAuctions: number;
  liveCount: number;
  totalBids: number;
  totalRevenue: number;
  avgBidsPerAuction: number;
  reserveMetRate: number;
}

export type AuctionNotificationKind =
  | "outbid"
  | "winning"
  | "won"
  | "reserve_met"
  | "auction_ended"
  | "system";

export interface AuctionNotification {
  id: string;
  auctionId: string;
  userId: string;
  kind: AuctionNotificationKind;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface PlaceBidResult {
  ok: boolean;
  error?: string;
  bidId?: string;
  amount?: number;
  bidderName?: string;
  extended?: boolean;
  leading?: boolean;
}

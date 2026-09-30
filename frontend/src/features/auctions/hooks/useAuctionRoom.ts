import { useCallback, useEffect, useState, useRef } from "react";
import type { RealtimeChannel } from "@/integrations/api/realtime";
import {
  fetchAuctionBySlug,
  fetchAuctionBids,
  fetchAuctionMessages,
  fetchAuctionNotifications,
  placeBidRpc,
  setAutoBidRpc,
  sendChatMessage,
  finalizeAuctionRpc,
  registerDealerAuctionRpc,
} from "../services/auction.service";
import { validateBidClient, recordBidAttempt } from "../lib/bid-validation";
import { detectBidFraud } from "../lib/fraud-detection";
import { getMinNextBid } from "../lib/auction-utils";
import {
  subscribeAuctionRoom,
  unsubscribeChannel,
  mergeBidFeed,
} from "../lib/realtime-channel";
import type { AuctionListing, AuctionBid, AuctionMessage, AuctionNotification } from "../types";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

const BID_COOLDOWN_MS = 400;
const NOTIFY_DEBOUNCE_MS = 1200;

export function useAuctionRoom(slug: string | undefined) {
  const { user } = useAuth();
  const [auction, setAuction] = useState<AuctionListing | null>(null);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [messages, setMessages] = useState<AuctionMessage[]>([]);
  const [notifications, setNotifications] = useState<AuctionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [bidLocked, setBidLocked] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [dealerRegistered, setDealerRegistered] = useState(false);
  const [registeringDealer, setRegisteringDealer] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const bidLockRef = useRef(false);
  const lastBidAtRef = useRef(0);
  const lastNotifyAtRef = useRef(0);
  const finalizedRef = useRef(false);
  const seenBidIdsRef = useRef(new Set<string>());

  const loadAuction = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const a = await fetchAuctionBySlug(slug);
    setAuction(a);
    if (a) {
      setViewerCount(a.viewerCount);
      const [b, m] = await Promise.all([fetchAuctionBids(a.id), fetchAuctionMessages(a.id)]);
      setBids(b);
      setMessages(m);
      seenBidIdsRef.current = new Set(b.map((x) => x.id));
      if (user) {
        const n = await fetchAuctionNotifications(a.id, user.id);
        setNotifications(n);
      }
    }
    setLoading(false);
  }, [slug, user?.id]);

  useEffect(() => {
    void loadAuction();
  }, [loadAuction]);

  /** Quiet resync of lot + bids (no skeleton) after bids, auto-bids or status changes. */
  const refreshLive = useCallback(async () => {
    if (!slug) return;
    const a = await fetchAuctionBySlug(slug);
    if (!a) return;
    setAuction(a);
    const b = await fetchAuctionBids(a.id);
    setBids(b);
    b.forEach((x) => seenBidIdsRef.current.add(x.id));
    if (user) setNotifications(await fetchAuctionNotifications(a.id, user.id));
  }, [slug, user?.id]);

  // Upcoming lot: reload when the start time arrives so bidding opens without a manual refresh.
  useEffect(() => {
    if (!auction || auction.status !== "upcoming" || !auction.startsAt) return;
    const wait = new Date(auction.startsAt).getTime() - Date.now();
    const id = setTimeout(() => void refreshLive(), Math.max(1500, wait + 1500));
    return () => clearTimeout(id);
  }, [auction?.id, auction?.status, auction?.startsAt, refreshLive]);

  // Realtime: single multiplexed channel
  useEffect(() => {
    if (!auction?.id) return;

    const presenceKey = user?.id ?? `anon-${crypto.randomUUID().slice(0, 8)}`;
    const channel = subscribeAuctionRoom(auction.id, presenceKey, {
      onAuctionUpdate: (patch) => {
        setAuction((prev) => (prev ? { ...prev, ...patch } : prev));
        if (patch.status === "ended") {
          toast("Auction has ended", { icon: "🏁" });
        }
      },
      onBidInsert: (bid) => {
        if (seenBidIdsRef.current.has(bid.id)) return;
        seenBidIdsRef.current.add(bid.id);
        setBids((prev) => mergeBidFeed(prev, bid));
        setAuction((prev) =>
          prev && bid.amount >= (prev.currentBid ?? prev.startingBid)
            ? { ...prev, currentBid: bid.amount, bidCount: prev.bidCount + 1 }
            : prev
        );
      },
      onMessageInsert: (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      },
      onNotificationInsert: (n) => {
        if (!user || n.userId !== user.id) return;
        const now = Date.now();
        setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
        if (n.kind === "outbid" && now - lastNotifyAtRef.current < NOTIFY_DEBOUNCE_MS) return;
        lastNotifyAtRef.current = now;
        toast(n.title, { icon: n.kind === "won" ? "🏆" : "🔔" });
      },
      onPresenceCount: setViewerCount,
    });

    channelRef.current = channel;
    return () => {
      unsubscribeChannel(channel);
      channelRef.current = null;
    };
  }, [auction?.id, user?.id]);

  // Auto-finalize when countdown hits zero (client-initiated; idempotent RPC)
  useEffect(() => {
    if (!auction || auction.status !== "live" || finalizedRef.current) return;

    const check = () => {
      if (Date.now() < new Date(auction.endsAt).getTime()) return;
      finalizedRef.current = true;
      void finalizeAuctionRpc(auction.id).then((r) => {
        if (r.ok) {
          setAuction((prev) =>
            prev
              ? {
                  ...prev,
                  status: "ended",
                  winnerId: r.winner_id ?? null,
                }
              : prev
          );
          void refreshLive();
        } else {
          // Anti-snipe may have extended the clock — resync and keep watching.
          void refreshLive();
          setTimeout(() => {
            finalizedRef.current = false;
          }, 5000);
        }
      });
    };

    const id = setInterval(check, 1000);
    check();
    return () => clearInterval(id);
  }, [auction?.id, auction?.endsAt, auction?.status, refreshLive]);

  const placeBid = useCallback(
    async (amount: number) => {
      if (!auction || !user) {
        toast.error("Please login to bid");
        return { ok: false };
      }
      if (bidLockRef.current) {
        toast.error("Bid in progress — please wait");
        return { ok: false };
      }
      const now = Date.now();
      if (now - lastBidAtRef.current < BID_COOLDOWN_MS) {
        toast.error("Please wait before bidding again");
        return { ok: false };
      }

      const clientCheck = validateBidClient(auction, amount, user.id);
      if (!clientCheck.valid) {
        toast.error(clientCheck.error!);
        return { ok: false };
      }

      const fraud = detectBidFraud({
        auctionId: auction.id,
        userId: user.id,
        amount,
        currentBid: auction.currentBid,
        startingBid: auction.startingBid,
        userBids: bids.filter((b) => b.bidderId === user.id),
        recentGlobalBids: bids.filter((b) => Date.now() - new Date(b.createdAt).getTime() < 60000).length,
      });

      if (!fraud.allowed) {
        toast.error(fraud.message ?? "Bid rejected");
        return { ok: false };
      }

      bidLockRef.current = true;
      setBidLocked(true);
      setPlacing(true);
      lastBidAtRef.current = now;

      const result = await placeBidRpc(auction.id, amount, false);

      if (!result.ok) {
        toast.error(result.error ?? "Bid failed — please try again");
        // Server state may have moved (someone else bid); resync the room.
        void refreshLive();
      } else {
        recordBidAttempt(auction.id, user.id, amount);
        if (result.bidId) {
          const optimistic: AuctionBid = {
            id: result.bidId,
            auctionId: auction.id,
            bidderId: user.id,
            bidderName: result.bidderName ?? user.fullName,
            amount: result.amount ?? amount,
            isAutoBid: false,
            createdAt: new Date().toISOString(),
          };
          seenBidIdsRef.current.add(optimistic.id);
          setBids((prev) => mergeBidFeed(prev, optimistic));
        }
        if (result.extended) toast("Anti-snipe: auction extended by 2 minutes", { icon: "⏱️" });
        if (result.leading === false) {
          toast("Bid placed, but another bidder's auto-bid is higher", { icon: "🔔" });
        } else {
          toast.success("Bid placed — you're the highest bidder!");
        }
        void refreshLive();
      }

      bidLockRef.current = false;
      setBidLocked(false);
      setPlacing(false);
      return { ok: result.ok };
    },
    [auction, user, bids, refreshLive]
  );

  const setAutoBid = useCallback(
    async (maxAmount: number) => {
      if (!auction || !user) return;
      if (!user) {
        toast.error("Please login to use auto-bid");
        return;
      }
      const result = await setAutoBidRpc(auction.id, maxAmount);
      if (result.ok) {
        toast.success(`Auto-bid on — we'll bid for you up to ₹${maxAmount.toLocaleString("en-IN")}`);
        void refreshLive();
      } else toast.error(result.error ?? "Auto-bid unavailable");
    },
    [auction, user, refreshLive]
  );

  const postMessage = useCallback(
    async (text: string) => {
      if (!auction || !user) return;
      await sendChatMessage(auction.id, text, user.fullName);
    },
    [auction, user]
  );

  const registerDealer = useCallback(async () => {
    if (!auction) return;
    setRegisteringDealer(true);
    const r = await registerDealerAuctionRpc(auction.id);
    if (r.ok) {
      setDealerRegistered(true);
      toast.success("Registered as dealer bidder");
    } else {
      toast.error(r.error ?? "Registration failed");
    }
    setRegisteringDealer(false);
  }, [auction]);

  const minBid = auction ? getMinNextBid(auction) : 0;

  return {
    auction,
    bids,
    messages,
    notifications,
    loading,
    placing,
    bidLocked,
    viewerCount,
    minBid,
    dealerRegistered,
    registeringDealer,
    placeBid,
    setAutoBid,
    postMessage,
    registerDealer,
    refetch: loadAuction,
  };
}

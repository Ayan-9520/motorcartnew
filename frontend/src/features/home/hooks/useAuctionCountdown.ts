import { useEffect, useState } from "react";
import { formatAuctionTimeLeft } from "@/features/home/lib/map-home-data";

export function useAuctionCountdown(endsAt?: string, tickMs = 1000): string {
  const [label, setLabel] = useState(() => (endsAt ? formatAuctionTimeLeft(endsAt) : ""));

  useEffect(() => {
    if (!endsAt) {
      setLabel("");
      return;
    }
    const tick = () => setLabel(formatAuctionTimeLeft(endsAt));
    tick();
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [endsAt, tickMs]);

  return label;
}

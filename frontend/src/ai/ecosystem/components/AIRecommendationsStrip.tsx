import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { AIPanel } from "./AIPanel";
import { recommendBestDeal } from "@/features/dealer-crm/services/commos.service";

interface AIRecommendationsStripProps {
  pool?: unknown;
  recentIds?: string[];
  wishlistIds?: string[];
  limit?: number;
}

export function AIRecommendationsStrip({ limit = 4 }: AIRecommendationsStripProps) {
  const [picks, setPicks] = useState<Array<{ vehicleId: string; title: string; price: number | null }>>([]);

  useEffect(() => {
    void recommendBestDeal("Find a vehicle for me")
      .then((res) => setPicks((res?.items ?? []).slice(0, limit)))
      .catch(() => setPicks([]));
  }, [limit]);

  if (!picks.length) return null;

  return (
    <AIPanel title="Best Deal For Me" subtitle="Ranked from live inventory — not a browser-only bot" compact>
      <ul className="ai-eco-recs">
        {picks.map((v) => (
          <li key={v.vehicleId}>
            <Link to={`/search?q=${encodeURIComponent(v.title)}`} className="ai-eco-rec">
              <span className="line-clamp-1 font-medium">{v.title}</span>
              <span className="text-xs text-muted-foreground">{v.price != null ? formatCurrency(v.price) : "Price on request"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AIPanel>
  );
}

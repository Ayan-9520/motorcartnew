import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEALER_CITY_OPTIONS, dealersBrowsePath } from "../data/dealers-hub-data";

interface DealersHubHeroProps {
  dealerCount: number;
}

export function DealersHubHero({ dealerCount }: DealersHubHeroProps) {
  const navigate = useNavigate();
  const [city, setCity] = useState("All cities");
  const [query, setQuery] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      dealersBrowsePath({
        q: query.trim() || undefined,
        city: city !== "All cities" ? city : undefined,
      })
    );
  };

  return (
    <section className="dealers-hub-hero">
      <div className="container">
        <div className="dealers-hub-hero-grid">
          <div>
            <span className="dealers-hub-badge">
              <Store className="mr-1.5 inline h-3.5 w-3.5" />
              Motorcart Dealer Network
            </span>
            <h1 className="dealers-hub-title">
              Find verified <span className="text-primary">dealers</span> near you
            </h1>
            <p className="dealers-hub-subtitle">
              {dealerCount > 0
                ? `${dealerCount.toLocaleString("en-IN")} KYC-verified dealers — new, used, bikes, commercial & EV — with AI leads, CRM & WhatsApp-ready inventory.`
                : "Find KYC-verified dealers — new, used, bikes, commercial & EV — with AI leads, CRM & WhatsApp-ready inventory."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
                <a href="/dashboard/dealer">Become a dealer partner</a>
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <a href={dealersBrowsePath()}>Browse directory</a>
              </Button>
            </div>
          </div>

          <form onSubmit={onSearch} className="dealers-hub-search-card">
            <p className="text-sm font-semibold text-foreground">Search dealers</p>
            <div className="dealers-hub-search-row">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="dealers-hub-select"
                aria-label="City"
              >
                {DEALER_CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="dealers-hub-search-row">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Dealer name, brand, specialty…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl font-semibold">
              Find dealers
            </Button>
            <div className="dealers-hub-search-stats">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On Motorcart</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{dealerCount.toLocaleString("en-IN")}+</p>
              <p className="text-sm text-muted-foreground">featured partners in directory</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

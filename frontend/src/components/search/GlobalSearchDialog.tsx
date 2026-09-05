import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Car,
  Package,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/uiStore";
import {
  runGlobalSearch,
  runGlobalSearchAsync,
  buildTrendingSearchHref,
  getAISearchIntent,
  getGlobalSearchIdleResults,
  type GlobalSearchResult,
} from "@/lib/global-search";
import { realDataOnly } from "@/config/real-data";
import { cn } from "@/lib/utils";
import { HERO_TRENDING_PICKS } from "@/features/home/data/homepage-data";
import { saveRecentSearch } from "@/integrations/api/unified-search";

const TYPE_ICON: Record<string, typeof Car> = {
  vehicle: Car,
  part: Package,
  page: Sparkles,
  job: Sparkles,
  dealer: Car,
  company: Sparkles,
};

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const preferNew =
    location.pathname.startsWith("/new-cars") ||
    location.pathname.includes("/buy/cars/new") ||
    location.pathname.includes("/buy/ev/");

  const trimmed = query.trim();
  const canLiveSearch = realDataOnly && trimmed.length >= 2;

  const { data: asyncResults, isFetching } = useQuery({
    queryKey: ["global-search", query, realDataOnly],
    queryFn: () => runGlobalSearchAsync(query, 10),
    enabled: canLiveSearch,
    staleTime: 30_000,
  });

  const idleResults = useMemo(() => getGlobalSearchIdleResults(6), []);
  const syncResults = useMemo(() => (realDataOnly ? [] : runGlobalSearch(query, 10)), [query]);

  const results = useMemo(() => {
    if (!trimmed) return idleResults;
    if (realDataOnly) {
      if (trimmed.length < 2) {
        return idleResults.filter(
          (p) =>
            p.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            (p.subtitle ?? "").toLowerCase().includes(trimmed.toLowerCase()) ||
            (p.badge ?? "").toLowerCase().includes(trimmed.toLowerCase())
        );
      }
      return asyncResults ?? [];
    }
    return syncResults;
  }, [trimmed, realDataOnly, idleResults, asyncResults, syncResults]);

  const aiIntent = useMemo(() => getAISearchIntent(query), [query]);
  const showTrending = !trimmed;
  const showEmptyMessage = trimmed.length >= 2 && !isFetching && results.length === 0;

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [searchOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const go = (href: string) => {
    setSearchOpen(false);
    navigate(href);
  };

  const goQuery = (term: string, mode?: "cars" | "bikes" | "trucks" | "buses" | "ev" | "auto" | "auctions" | "finance") => {
    const t = term.trim();
    if (!t) return;
    saveRecentSearch(t);
    if (mode === "auctions") {
      go("/auctions");
      return;
    }
    if (mode === "finance") {
      go("/finance");
      return;
    }
    const hubMode =
      mode === "bikes" || mode === "trucks" || mode === "buses" || mode === "ev"
        ? mode
        : "cars";
    go(buildTrendingSearchHref({ query: t, mode: hubMode, preferNew: preferNew || undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[activeIndex]) {
      if (trimmed) saveRecentSearch(trimmed);
      go(results[activeIndex].href);
      return;
    }
    if (trimmed) goQuery(trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      if (trimmed) saveRecentSearch(trimmed);
      go(results[activeIndex].href);
    }
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent
        showCloseButton={false}
        className="global-search-dialog ai-eco-search max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search Motorcart</DialogTitle>
        <form onSubmit={onSubmit} className="border-b border-border/70 p-4">
          <div className="global-search-field relative flex items-center rounded-xl border border-border/70 bg-muted/35 px-3 transition-colors focus-within:border-border focus-within:bg-card focus-within:ring-1 focus-within:ring-border/80">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search vehicles, parts, finance, services…"
              className="h-12 flex-1 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="pointer-events-none hidden shrink-0 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="global-search-results max-h-[50vh] overflow-y-auto p-2">
          {aiIntent && trimmed && (
            <p className="ai-eco-search-hint px-2 pb-2">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
              Intent: <strong>{aiIntent.label}</strong>
            </p>
          )}

          {showTrending && (
            <div className="px-2 pb-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Trending
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HERO_TRENDING_PICKS.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
                    onClick={() => goQuery(t.query, t.mode)}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Quick links
              </p>
            </div>
          )}

          {isFetching && canLiveSearch ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Searching live inventory…</p>
          ) : showEmptyMessage ? (
            <div className="space-y-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">No exact matches — browse marketplace for this search</p>
              <button
                type="button"
                className="text-sm font-semibold text-primary hover:underline"
                onClick={() => goQuery(query)}
              >
                Open “{trimmed}” listings
              </button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item, i) => (
                <SearchResultRow
                  key={item.id}
                  item={item}
                  active={i === activeIndex}
                  onPick={() => {
                    if (trimmed) saveRecentSearch(trimmed);
                    go(item.href);
                  }}
                  onHover={() => setActiveIndex(i)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-3 w-3" /> ↑↓ navigate · Enter open · Esc close
          </span>
          {trimmed && (
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => goQuery(query)}
            >
              View all results <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResultRow({
  item,
  active,
  onPick,
  onHover,
}: {
  item: GlobalSearchResult;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? Sparkles;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={onHover}
        className={cn(
          "global-search-result flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          active && "global-search-result-active"
        )}
      >
        {item.image ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-11 w-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 font-semibold text-foreground">{item.title}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</span>
        </span>
        {item.badge && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}

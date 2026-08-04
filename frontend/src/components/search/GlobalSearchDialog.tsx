import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import { runGlobalSearch, runGlobalSearchAsync, buildSearchPageUrl, getAISearchIntent, type GlobalSearchResult } from "@/lib/global-search";
import { realDataOnly } from "@/config/real-data";
import { cn } from "@/lib/utils";
import { TRENDING_SEARCHES } from "@/features/home/data/homepage-data";

const TYPE_ICON = {
  vehicle: Car,
  part: Package,
  page: Sparkles,
} as const;

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: asyncResults, isFetching } = useQuery({
    queryKey: ["global-search", query, realDataOnly],
    queryFn: () => runGlobalSearchAsync(query, 10),
    enabled: realDataOnly && query.trim().length > 0,
    staleTime: 30_000,
  });

  const syncResults = useMemo(() => (realDataOnly ? [] : runGlobalSearch(query, 10)), [query]);
  const results = realDataOnly ? (query.trim() ? (asyncResults ?? []) : runGlobalSearch(query, 10)) : syncResults;
  const aiIntent = useMemo(() => getAISearchIntent(query), [query]);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[activeIndex]) {
      go(results[activeIndex].href);
      return;
    }
    if (query.trim()) go(buildSearchPageUrl(query));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex].href);
    }
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="global-search-dialog ai-eco-search max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search Motorcart</DialogTitle>
        <form onSubmit={onSubmit} className="border-b border-border/80 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="AI search — vehicles, parts, loans, services…"
              className="h-12 border-0 bg-transparent pl-11 pr-24 text-base shadow-none focus-visible:ring-primary"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="global-search-results max-h-[50vh] overflow-y-auto p-2">
          {aiIntent && query.trim() && (
            <p className="ai-eco-search-hint px-2 pb-2">
              <Sparkles className="inline h-3.5 w-3.5 text-primary mr-1" />
              Intent: <strong>{aiIntent.label}</strong>
            </p>
          )}
          {!query.trim() && (
            <div className="px-2 pb-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Trending
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.slice(0, 5).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
                    onClick={() => setQuery(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFetching && query.trim() ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Searching live inventory…</p>
          ) : results.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No results — try another keyword</p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item, i) => (
                <SearchResultRow
                  key={item.id}
                  item={item}
                  active={i === activeIndex}
                  onPick={() => go(item.href)}
                  onHover={() => setActiveIndex(i)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-3 w-3" /> ↑↓ navigate · Enter open
          </span>
          {query.trim() && (
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => go(buildSearchPageUrl(query))}
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
  const Icon = TYPE_ICON[item.type];
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
          <img src={item.image} alt="" loading="lazy" decoding="async" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

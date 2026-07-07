import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { setPageMeta } from "@/utils/seo";
import {
  fetchFederatedSearch,
  fetchSearchCategories,
  fetchSearchSuggestions,
  isUnifiedSearchEnabled,
  loadRecentSearches,
  saveRecentSearch,
  type UnifiedSearchResultDto,
} from "@/integrations/api/unified-search";

export function UnifiedSearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<UnifiedSearchResultDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setPageMeta({
      title: q ? `Search: ${q} — Motorcart` : "Search — Motorcart",
      description: "Federated search across vehicles, businesses, community, auctions, and more.",
    });
  }, [q]);

  useEffect(() => {
    if (!isUnifiedSearchEnabled()) return;
    void fetchSearchCategories().then((d) => {
      if (d?.categories) setCategories(d.categories);
    });
    setRecent(loadRecentSearches());
  }, []);

  useEffect(() => {
    setInput(q);
    if (!isUnifiedSearchEnabled()) return;
    if (!q.trim() && !category) {
      setResults([]);
      setTotal(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchFederatedSearch({ q, category: category || undefined, limit: 80 }).then((data) => {
      if (cancelled || !data) return;
      setResults(data.results);
      setTotal(data.total);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [q, category]);

  useEffect(() => {
    if (!isUnifiedSearchEnabled() || input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      void fetchSearchSuggestions(input).then((d) => {
        setSuggestions(d?.suggestions ?? []);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [input]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    if (term) saveRecentSearch(term);
    setRecent(loadRecentSearches());
    const next = new URLSearchParams(params);
    if (term) next.set("q", term);
    else next.delete("q");
    setParams(next);
  };

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("category", id);
    else next.delete("category");
    setParams(next);
  };

  if (!isUnifiedSearchEnabled()) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Unified search is disabled. Enable VITE_FEATURE_M5_UNIFIED_SEARCH.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="border-b bg-muted/30">
        <div className="container py-10">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-7 w-7 text-primary" />
            Search MotorCart
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Federated search — vehicles, auctions, directory, community, growth
          </p>

          <form onSubmit={onSubmit} className="relative mt-6 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Brand, dealer, workshop, auction…"
              className="h-12 pl-12 pr-28"
              autoComplete="off"
            />
            <Button type="submit" className="absolute right-1.5 top-1.5 h-9">
              Search
            </Button>
            {suggestions.length > 0 && input.trim().length >= 2 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-md text-sm">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setInput(s);
                        const next = new URLSearchParams(params);
                        next.set("q", s);
                        setParams(next);
                        saveRecentSearch(s);
                      }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {recent.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Recent:</span>
              {recent.map((r) => (
                <Button key={r} variant="outline" size="sm" className="h-7 rounded-full" asChild>
                  <Link to={`/search?q=${encodeURIComponent(r)}`}>{r}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!category ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("")}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </p>
        )}

        {!loading && q.trim() && (
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? "" : "s"} for &quot;{q}&quot;
          </p>
        )}

        <ul className="space-y-3">
          {results.map((r, idx) => (
            <li key={`${r.url}-${idx}`}>
              <Link
                to={r.url}
                className="block rounded-lg border p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium">{r.title}</span>
                  <Badge variant="outline">{r.result_type.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary">{r.source}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        {!loading && q.trim() && results.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No matches. Try another keyword or category.</p>
        )}

        {!q.trim() && !category && (
          <p className="text-center text-muted-foreground py-12">
            Enter a search term or pick a category filter.
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdvancedSearchBarProps {
  onToggleFilters?: () => void;
}

export function AdvancedSearchBar({ onToggleFilters }: AdvancedSearchBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const applySearch = (query: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = query.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(q);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brand, model, city..."
          className="h-11 pl-10"
        />
      </div>
      <Button type="submit" variant="default" className="h-11 px-6">
        Search
      </Button>
      {onToggleFilters && (
        <Button
          type="button"
          variant="outline"
          className="h-11 lg:hidden"
          onClick={onToggleFilters}
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}

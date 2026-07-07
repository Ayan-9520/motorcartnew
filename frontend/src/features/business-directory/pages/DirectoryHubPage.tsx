import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DIRECTORY_CATEGORIES,
  fetchDirectoryHub,
  isDirectoryEnabled,
  searchDirectory,
  businessProfilePath,
} from "@/features/business-directory/services/directory-api.service";

export function DirectoryHubPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!isDirectoryEnabled()) return;
    void fetchDirectoryHub();
  }, []);

  if (!isDirectoryEnabled()) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Business directory</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enable <code className="text-xs">VITE_FEATURE_BUSINESS_DIRECTORY_V2</code> to browse
          automotive businesses.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automotive business directory</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Find dealers, brokers, DSA, insurance, workshops, parts sellers, and influencers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DIRECTORY_CATEGORIES.map((c) => (
          <Link key={c.slug} to={`/directory/${c.slug}`}>
            <Card className="px-4 py-3 hover:border-primary/50 min-w-[120px] text-center">
              <span className="text-sm font-medium">{c.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium text-sm">Search all categories</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search name or city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="max-w-[140px]"
          />
          <Button
            size="sm"
            onClick={() =>
              void searchDirectory({
                q,
                city,
                verified: "",
              }).then((res) => {
                if (res.ok) setResults(res.data.data ?? []);
              })
            }
          >
            Search
          </Button>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {results.map((b) => (
            <li key={String(b.id)}>
              <Link to={businessProfilePath(b)} className="text-sm text-primary underline">
                {String(b.name)} — {String(b.city ?? "India")}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-muted-foreground">
        Featured / sponsored / premium listings — architecture prepared, monetization not enabled.
      </p>
    </div>
  );
}

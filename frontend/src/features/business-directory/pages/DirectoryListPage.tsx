import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  businessProfilePath,
  DIRECTORY_CATEGORIES,
  fetchDirectoryCategory,
  isDirectoryEnabled,
} from "@/features/business-directory/services/directory-api.service";

export function DirectoryListPage() {
  const { category = "dealers" } = useParams<{ category: string }>();
  const label = DIRECTORY_CATEGORIES.find((c) => c.slug === category)?.label ?? category;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const load = useCallback(async () => {
    if (!isDirectoryEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchDirectoryCategory(category, {
      q,
      city,
      state,
      verified: verifiedOnly ? "true" : "",
    });
    if (res.ok) setRows(res.data.data ?? []);
    setLoading(false);
  }, [category, q, city, state, verifiedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isDirectoryEnabled()) {
    return (
      <p className="container py-16 text-center text-muted-foreground">Directory disabled.</p>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Link to="/directory" className="text-sm text-muted-foreground hover:text-foreground">
        ← Directory
      </Link>
      <h1 className="text-2xl font-bold">{label}</h1>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="max-w-[120px]" />
        <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="max-w-[120px]" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          Verified only
        </label>
        <Button size="sm" onClick={() => void load()}>
          Apply
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No businesses found.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <li key={String(b.id)}>
              <Link to={businessProfilePath(b)}>
                <Card className="p-4 h-full hover:border-primary/40">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{String(b.name)}</p>
                    {b.is_verified ? <Badge variant="secondary">Verified</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[b.city, b.state].filter(Boolean).join(", ") || "India"}
                  </p>
                  <p className="text-xs mt-2 line-clamp-2">{String(b.tagline ?? "")}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

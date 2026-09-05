import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { fetchSavedSearches, mutateSavedSearch } from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function CustomerSavedSearchesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("My search");
  const [brand, setBrand] = useState("");
  const [pin, setPin] = useState("");

  async function refresh() {
    setRows(await fetchSavedSearches());
  }

  useEffect(() => {
    setPageMeta({ title: "Saved searches" });
    void refresh();
  }, []);

  return (
    <CustomerEcosystemPage title="Saved searches" description="Stored marketplace filters. Matches are only shown when real inventory exists.">
      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void mutateSavedSearch({
            name,
            criteria: { brand, pincode: pin || undefined },
            notifyOnMatch: true,
          }).then(refresh);
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="max-w-40" />
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" className="max-w-40" />
        <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN (6 digits)" className="max-w-40" />
        <Button type="submit">Save</Button>
      </form>
      <ul className="space-y-3">
        {rows.length === 0 ? <p className="cos-empty">No saved searches yet.</p> : null}
        {rows.map((r) => (
          <li key={String(r.id)} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{String(r.name)}</p>
            <p className="text-muted-foreground">{JSON.stringify(r.criteria)}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void mutateSavedSearch({ action: "run", id: r.id })}>
                Run
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateSavedSearch({ action: "delete", id: r.id }).then(refresh)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </CustomerEcosystemPage>
  );
}

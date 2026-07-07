import { useEffect, useState } from "react";
import { ExternalLink, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { useDealer } from "../hooks/useDealer";
import { fetchStorefront, upsertStorefront, type DealerStorefront } from "../services/dealer-enterprise.service";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

export function DealerStorefrontPage() {
  const { dealer, loading } = useDealer();
  const [form, setForm] = useState<Partial<DealerStorefront>>({
    showFinanceOffers: true,
    showReviews: true,
    showInventory: true,
    showcaseTags: [],
  });

  useEffect(() => {
    setPageMeta({ title: "Public storefront" });
    if (dealer) {
      void fetchStorefront(dealer.id).then((s) => {
        if (s) setForm(s);
        else setForm((f) => ({ ...f, dealerId: dealer.id, contactPhone: dealer.phone }));
      });
    }
  }, [dealer]);

  const save = async () => {
    if (!dealer) return;
    const { error } = await upsertStorefront(dealer.id, form);
    if (error) toast.error(error.message);
    else toast.success("Storefront saved");
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!dealer) {
    return (
      <DealerConsoleShell
        title="Public storefront"
        description="Complete your dealer profile to manage your public storefront."
        crumbs={[{ label: "Storefront" }]}
      >
        <p className="text-muted-foreground">
          No dealer profile found for this account. Complete onboarding or contact support.
        </p>
      </DealerConsoleShell>
    );
  }

  return (
    <DealerConsoleShell
      title="Public storefront"
      description="SEO profile, contact, finance offers and inventory visibility on Motorcart."
      crumbs={[{ label: "Storefront" }]}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to={`/dealers/${dealer.slug}`} target="_blank">
            <ExternalLink className="h-4 w-4 mr-1" /> Preview
          </Link>
        </Button>
      }
    >
      <div className="dealer-os-grid-2">
        <section className="dealer-os-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Store className="h-5 w-5" /> SEO & branding
          </h2>
          <div>
            <label className="dealer-os-label">SEO title</label>
            <Input
              value={form.seoTitle ?? ""}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              placeholder={`${dealer.name} — Cars in ${dealer.city}`}
            />
          </div>
          <div>
            <label className="dealer-os-label">Meta description</label>
            <Textarea
              rows={3}
              value={form.seoDescription ?? ""}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
            />
          </div>
          <div>
            <label className="dealer-os-label">Hero tagline</label>
            <Input
              value={form.heroTagline ?? ""}
              onChange={(e) => setForm({ ...form, heroTagline: e.target.value })}
            />
          </div>
          <div>
            <label className="dealer-os-label">WhatsApp</label>
            <Input
              value={form.contactWhatsapp ?? ""}
              onChange={(e) => setForm({ ...form, contactWhatsapp: e.target.value })}
            />
          </div>
        </section>

        <section className="dealer-os-card space-y-4">
          <h2 className="font-semibold">Visibility</h2>
          {(
            [
              ["showInventory", "Show inventory"],
              ["showFinanceOffers", "Show finance offers"],
              ["showReviews", "Show reviews"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <Button onClick={() => void save()}>Save storefront</Button>
        </section>
      </div>
    </DealerConsoleShell>
  );
}

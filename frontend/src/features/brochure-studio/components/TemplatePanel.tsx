import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderPoster, type PosterAssets } from "../lib/render-poster";
import { TEMPLATE_META, type BrochureDesign, type BrochureTemplateId, type BrochureVehicle } from "../types";

const FILTERS: { id: "all" | "new" | "used" | "comparison" | "offers" | "social"; label: string }[] = [
  { id: "all", label: "All templates" },
  { id: "new", label: "New car" },
  { id: "used", label: "Used car" },
  { id: "comparison", label: "Comparison" },
  { id: "offers", label: "Offers" },
  { id: "social", label: "Social media" },
];

const ORDER = Object.keys(TEMPLATE_META) as BrochureTemplateId[];

type Props = {
  vehicle: BrochureVehicle | null;
  compare: BrochureVehicle | null;
  assets: PosterAssets;
  selected: BrochureTemplateId;
  designFor: (t: BrochureTemplateId) => BrochureDesign | null;
  renderKey: string;
  onSelect: (t: BrochureTemplateId) => void;
};

export function TemplatePanel({ vehicle, compare, assets, selected, designFor, renderKey, onSelect }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [thumbs, setThumbs] = useState<Partial<Record<BrochureTemplateId, string>>>({});

  useEffect(() => {
    if (!vehicle) return;
    const timer = window.setTimeout(() => {
      const big = document.createElement("canvas");
      const small = document.createElement("canvas");
      small.width = 216;
      small.height = 270;
      const sctx = small.getContext("2d");
      const out: Partial<Record<BrochureTemplateId, string>> = {};
      for (const t of ORDER) {
        const design = designFor(t);
        if (!design || !sctx) continue;
        renderPoster(big, { ...design, size: "portrait" }, vehicle, compare, assets);
        sctx.clearRect(0, 0, small.width, small.height);
        sctx.imageSmoothingQuality = "high";
        sctx.drawImage(big, 0, 0, small.width, small.height);
        out[t] = small.toDataURL("image/jpeg", 0.7);
      }
      setThumbs(out);
    }, 450);
    return () => window.clearTimeout(timer);
    // designFor is derived from renderKey; re-render thumbnails only when inputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, compare, assets, renderKey]);

  const visible = ORDER.filter((t) => {
    const g = TEMPLATE_META[t].group;
    return filter === "all" || g === filter || g === "all";
  });

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold tracking-normal">Choose template</h2>
      <p className="text-xs text-muted-foreground">Live previews with your car, photos and branding.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {visible.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            className={cn(
              "group relative overflow-hidden rounded-xl border text-left transition",
              selected === t ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"
            )}
            aria-pressed={selected === t}
          >
            <div className="aspect-[4/5] w-full bg-muted">
              {thumbs[t] ? <img src={thumbs[t]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            {selected === t ? (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
            ) : null}
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-semibold">{TEMPLATE_META[t].name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{TEMPLATE_META[t].short}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

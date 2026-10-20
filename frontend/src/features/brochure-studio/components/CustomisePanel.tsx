import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, Wand2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PHOTO_ANGLES, isPhotoAngle, type PhotoAngle, type PhotoAngleMap } from "@/lib/photo-angles";
import type { VehicleListing } from "@/types/vehicle";
import { emiFor, formatLakh, formatRupees } from "../lib/brochure-model";
import { searchCompareVehicles } from "../services/brochure.service";
import {
  COLOR_PRESETS,
  PRESET_LABELS,
  type BrochureBranding,
  type BrochureColors,
  type BrochureContent,
  type BrochureImageSelection,
  type BrochureTemplateId,
  type BrochureVehicle,
} from "../types";

type Props = {
  template: BrochureTemplateId;
  vehicle: BrochureVehicle;
  content: BrochureContent;
  onContent: (patch: Partial<BrochureContent>) => void;
  branding: BrochureBranding;
  onBranding: (patch: Partial<BrochureBranding>) => void;
  colors: BrochureColors;
  onColors: (c: BrochureColors) => void;
  images: BrochureImageSelection;
  onImages: (patch: Partial<BrochureImageSelection>) => void;
  angles: PhotoAngleMap;
  onAngles: (a: PhotoAngleMap) => void;
  anglesDirty: boolean;
  aiBusy: "" | "copy" | "highlights" | "angles";
  onAiCopy: () => void;
  onAiHighlights: () => void;
  onDetectAngles: () => void;
  onSaveAngles: () => void;
  onAutoArrange: () => void;
  inventory: VehicleListing[];
  compare: VehicleListing | null;
  onCompare: (v: VehicleListing | null) => void;
  onLogoFile: (f: File) => void;
  logoBusy: boolean;
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ComparePicker({
  vehicle,
  inventory,
  compare,
  onCompare,
}: {
  vehicle: BrochureVehicle;
  inventory: VehicleListing[];
  compare: VehicleListing | null;
  onCompare: (v: VehicleListing | null) => void;
}) {
  const [q, setQ] = useState("");
  const [market, setMarket] = useState<VehicleListing[]>([]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      void searchCompareVehicles(q, vehicle.id).then(setMarket);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, vehicle.id]);
  const n = q.trim().toLowerCase();
  const own = inventory.filter((v) => v.id !== vehicle.id && (!n || `${v.brand} ${v.model} ${v.variant ?? ""}`.toLowerCase().includes(n)));
  const ownIds = new Set(own.map((v) => v.id));
  const rows = [...own.map((v) => ({ v, own: true })), ...market.filter((v) => !ownIds.has(v.id)).map((v) => ({ v, own: false }))].slice(0, 20);

  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs font-semibold">Compare with</p>
      {compare ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          <span className="truncate font-medium">{`${compare.brand} ${compare.model} ${compare.variant ?? ""}`.trim()}</span>
          <button type="button" onClick={() => onCompare(null)} aria-label="Remove comparison car">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <Input className="mt-2" placeholder="Search e.g. WagonR CNG, Punch, Creta" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {rows.map(({ v, own }) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onCompare(v)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
              compare?.id === v.id && "bg-primary/10"
            )}
          >
            <span className="truncate">{`${v.brand} ${v.model} ${v.variant ?? ""}`.trim()}</span>
            <span className="shrink-0 text-muted-foreground">
              {v.price > 0 ? formatLakh(v.price) : ""} {own ? "· your stock" : ""}
            </span>
          </button>
        ))}
        {!rows.length ? <p className="py-2 text-xs text-muted-foreground">No cars found on MotorCart for “{q}”.</p> : null}
      </div>
    </div>
  );
}

export function CustomisePanel(p: Props) {
  const { template, vehicle, content, onContent, branding, onBranding, colors, onColors, images, onImages } = p;
  const logoRef = useRef<HTMLInputElement>(null);
  const emi = emiFor(content, vehicle.price);
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const toggleGallery = (url: string) => {
    const has = images.galleryUrls.includes(url);
    const next = has ? images.galleryUrls.filter((u) => u !== url) : [...images.galleryUrls, url].slice(0, 8);
    onImages({ galleryUrls: next });
  };

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold tracking-normal">Customise poster</h2>
      <Tabs defaultValue="content" className="mt-3">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="colours">Colours</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" disabled={Boolean(p.aiBusy)} onClick={p.onAiCopy}>
              {p.aiBusy === "copy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI headline
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" disabled={Boolean(p.aiBusy)} onClick={p.onAiHighlights}>
              {p.aiBusy === "highlights" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} AI highlights
            </Button>
          </div>
          {template === "comparison" ? (
            <ComparePicker vehicle={vehicle} inventory={p.inventory} compare={p.compare} onCompare={p.onCompare} />
          ) : null}
          <Field id="bs-headline" label="Title / heading">
            <Input id="bs-headline" value={content.headline} maxLength={80} onChange={(e) => onContent({ headline: e.target.value })} />
          </Field>
          <Field id="bs-tagline" label="Offer / tagline">
            <Input id="bs-tagline" value={content.tagline} maxLength={120} onChange={(e) => onContent({ tagline: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="bs-price" label="Price text">
              <Input id="bs-price" value={content.priceText} maxLength={30} onChange={(e) => onContent({ priceText: e.target.value })} />
            </Field>
            <Field id="bs-price-note" label="Price note">
              <Input id="bs-price-note" value={content.priceNote} maxLength={40} onChange={(e) => onContent({ priceNote: e.target.value })} />
            </Field>
            <Field id="bs-cta" label="Button text">
              <Input id="bs-cta" value={content.ctaText} maxLength={24} onChange={(e) => onContent({ ctaText: e.target.value })} />
            </Field>
            <Field id="bs-badge" label="Badge (e.g. SPECIAL OFFER)">
              <Input id="bs-badge" value={content.offerBadge} maxLength={24} onChange={(e) => onContent({ offerBadge: e.target.value })} />
            </Field>
          </div>
          {template === "finance_offer" ? (
            <div className="grid grid-cols-3 gap-3 rounded-xl border p-3">
              <Field id="bs-dp" label="Down payment ₹">
                <Input id="bs-dp" type="number" min={0} value={content.downPayment} onChange={(e) => onContent({ downPayment: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <Field id="bs-rate" label="Interest %">
                <Input id="bs-rate" type="number" min={0} step={0.1} value={content.interestRate} onChange={(e) => onContent({ interestRate: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <Field id="bs-tenure" label="Tenure (months)">
                <Input id="bs-tenure" type="number" min={6} max={96} value={content.tenureMonths} onChange={(e) => onContent({ tenureMonths: Math.min(96, Math.max(6, Number(e.target.value) || 60)) })} />
              </Field>
              <p className="col-span-3 text-xs text-muted-foreground">
                EMI on poster: <strong className="text-foreground">{emi > 0 ? `${formatRupees(emi)}/month` : "add a price"}</strong> (indicative)
              </p>
            </div>
          ) : null}
          {template === "custom" ? (
            <Field id="bs-body" label="Bullet points (one per line)">
              <Textarea id="bs-body" rows={5} value={content.bodyText} onChange={(e) => onContent({ bodyText: e.target.value })} />
            </Field>
          ) : (
            <Field id="bs-features" label="Highlights (one per line, up to 10)">
              <Textarea
                id="bs-features"
                rows={6}
                value={content.features.join("\n")}
                onChange={(e) => onContent({ features: e.target.value.split("\n").slice(0, 10) })}
                onBlur={(e) => onContent({ features: lines(e.target.value).slice(0, 10) })}
              />
            </Field>
          )}
          <Field id="bs-badges" label={vehicle.condition === "used" ? "Trust badges (one per line)" : "Benefits (one per line)"}>
            <Textarea
              id="bs-badges"
              rows={3}
              value={content.trustBadges.join("\n")}
              onChange={(e) => onContent({ trustBadges: e.target.value.split("\n").slice(0, 6) })}
              onBlur={(e) => onContent({ trustBadges: lines(e.target.value).slice(0, 6) })}
            />
          </Field>
        </TabsContent>

        <TabsContent value="branding" className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Dealer logo" className="h-12 w-12 rounded-lg border object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold text-primary">
                {(branding.dealerName || "D").charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Dealer logo</p>
              <p className="text-xs text-muted-foreground">PNG with transparent background works best. Saved to your dealership profile.</p>
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onLogoFile(f);
                e.target.value = "";
              }}
            />
            <Button type="button" size="sm" variant="outline" className="gap-1" disabled={p.logoBusy} onClick={() => logoRef.current?.click()}>
              {p.logoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="bs-dealer" label="Dealer name">
              <Input id="bs-dealer" value={branding.dealerName} maxLength={60} onChange={(e) => onBranding({ dealerName: e.target.value })} />
            </Field>
            <Field id="bs-phone" label="Contact number">
              <Input id="bs-phone" value={branding.phone} maxLength={20} inputMode="tel" onChange={(e) => onBranding({ phone: e.target.value })} />
            </Field>
            <Field id="bs-city" label="City">
              <Input id="bs-city" value={branding.city} maxLength={40} onChange={(e) => onBranding({ city: e.target.value })} />
            </Field>
            <Field id="bs-dtag" label="Dealer line">
              <Input id="bs-dtag" value={branding.dealerTagline} maxLength={60} onChange={(e) => onBranding({ dealerTagline: e.target.value })} />
            </Field>
          </div>
          <Field id="bs-services" label="Services line">
            <Input id="bs-services" value={branding.services} maxLength={90} onChange={(e) => onBranding({ services: e.target.value })} />
          </Field>
          <div className="divide-y rounded-xl border px-3">
            <Toggle label="Show dealer logo" checked={branding.showDealerLogo} onChange={(v) => onBranding({ showDealerLogo: v })} />
            <Toggle label="Show contact details" checked={branding.showContact} onChange={(v) => onBranding({ showContact: v })} />
            <Toggle label="QR code to this car's listing" checked={branding.showQr} onChange={(v) => onBranding({ showQr: v })} />
            <Toggle label="Add watermark on photos" checked={branding.showWatermark} onChange={(v) => onBranding({ showWatermark: v })} />
          </div>
        </TabsContent>

        <TabsContent value="colours" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.preset}
                type="button"
                onClick={() => onColors(c)}
                className={cn("rounded-xl border p-2 text-left", colors.preset === c.preset && "border-primary ring-2 ring-primary/30")}
              >
                <span className="flex gap-1">
                  {[c.primary, c.accent, c.dark].map((hex) => (
                    <span key={hex} className="h-5 w-5 rounded-full border" style={{ background: hex }} />
                  ))}
                </span>
                <span className="mt-1 block text-[11px] font-medium">{PRESET_LABELS[c.preset]}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["primary", "Primary"],
                ["accent", "Button / accent"],
                ["dark", "Footer"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="text-xs">
                {label}
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border bg-background"
                  value={colors[k]}
                  onChange={(e) => onColors({ ...colors, preset: "custom", [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Click a photo to make it the main (hero) photo. Tick photos to show in the angle strip. Label each angle — AI can do it for you.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" disabled={Boolean(p.aiBusy) || !vehicle.images.length} onClick={p.onDetectAngles}>
              {p.aiBusy === "angles" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI detect angles
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={p.onAutoArrange}>
              Auto-arrange by angle
            </Button>
            <Button type="button" size="sm" disabled={!p.anglesDirty} onClick={p.onSaveAngles}>
              Save labels to listing
            </Button>
          </div>
          {vehicle.images.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              This car has no photos yet. Add photos in inventory (Front, Side, Rear, Interior, Dashboard…).
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {vehicle.images.map((url, i) => {
                const isHero = images.heroUrl === url;
                const isSecond = images.secondaryUrl === url;
                const inGallery = images.galleryUrls.includes(url);
                return (
                  <div key={url} className={cn("overflow-hidden rounded-xl border", isHero && "border-primary ring-2 ring-primary/30")}>
                    <button type="button" className="relative block aspect-[4/3] w-full bg-muted" onClick={() => onImages({ heroUrl: url })} title="Use as main photo">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      {isHero ? <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Main</span> : null}
                      {isSecond ? <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">2nd</span> : null}
                    </button>
                    <select
                      className="w-full border-t bg-background px-1 py-1 text-[11px]"
                      value={p.angles[url] ?? ""}
                      onChange={(e) => {
                        const next: PhotoAngleMap = {};
                        const val = e.target.value;
                        for (const [u, a] of Object.entries(p.angles)) if (u !== url && a !== val) next[u] = a;
                        if (isPhotoAngle(val)) next[url] = val as PhotoAngle;
                        p.onAngles(next);
                      }}
                      aria-label={`Angle for photo ${i + 1}`}
                    >
                      <option value="">Angle…</option>
                      {PHOTO_ANGLES.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between border-t px-1.5 py-1 text-[11px]">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={inGallery} onChange={() => toggleGallery(url)} /> Strip
                      </label>
                      <button type="button" className="text-primary hover:underline" onClick={() => onImages({ secondaryUrl: isSecond ? "" : url })}>
                        {isSecond ? "Unset 2nd" : "Set 2nd"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

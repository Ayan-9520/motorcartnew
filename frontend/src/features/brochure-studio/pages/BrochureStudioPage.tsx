import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import { DealerConsoleShell } from "@/features/dealer-crm/components/DealerConsoleShell";
import { NewCarDealerShell } from "@/features/new-car-dealer/components/NewCarDealerShell";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { updateDealerProfile } from "@/features/dealer-crm/services/dealer-enterprise.service";
import { uploadFile } from "@/services/storage.service";
import { cleanPhotoAngles, type PhotoAngleMap } from "@/lib/photo-angles";
import { cn } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import type { VehicleListing } from "@/types/vehicle";
import { VehiclePanel } from "../components/VehiclePanel";
import { TemplatePanel } from "../components/TemplatePanel";
import { CustomisePanel } from "../components/CustomisePanel";
import { PreviewPanel, type PreviewAction } from "../components/PreviewPanel";
import { LeadPickerDialog } from "../components/LeadPickerDialog";
import { usePosterAssets } from "../hooks/usePosterAssets";
import { defaultBranding, defaultContent, defaultImages, listingUrl, toBrochureVehicle } from "../lib/brochure-model";
import { renderPoster } from "../lib/render-poster";
import { canvasBlob, downloadBlob, downloadPdf, posterFilename, shareFile } from "../lib/export-poster";
import {
  absoluteUrl,
  aiCopy,
  aiHighlights,
  attachPosterToLead,
  detectPhotoAngles,
  fetchStudioLeads,
  fetchStudioVehicles,
  loadRecentPosters,
  pushRecentPoster,
  savePhotoAngles,
  uploadPoster,
  whatsappLink,
  type RecentPoster,
  type StudioLead,
} from "../services/brochure.service";
import {
  COLOR_PRESETS,
  TEMPLATE_META,
  type BrochureBranding,
  type BrochureColors,
  type BrochureContent,
  type BrochureDesign,
  type BrochureImageSelection,
  type BrochureTemplateId,
  type PosterSize,
} from "../types";

const STEPS = [
  { n: 1, title: "Select vehicle", sub: "From your inventory (new or used)" },
  { n: 2, title: "Vehicle details", sub: "Specs, photos & price auto-filled" },
  { n: 3, title: "Choose template", sub: "8 professional designs" },
  { n: 4, title: "Customise", sub: "Logo, price, offers, colours" },
  { n: 5, title: "Generate & share", sub: "PNG, PDF, WhatsApp, leads" },
];

function isTemplate(v: string | null): v is BrochureTemplateId {
  return Boolean(v && v in TEMPLATE_META);
}

type Variant = "dealer" | "new-car";

export function DealerBrochureStudioPage() {
  return <BrochureStudioPage variant="dealer" />;
}

export function NewCarBrochureStudioPage() {
  return <BrochureStudioPage variant="new-car" />;
}

export function BrochureStudioPage({ variant = "dealer" }: { variant?: Variant }) {
  const { dealer, user, refetch: refetchDealer } = useDealer();
  const [params, setParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [listings, setListings] = useState<VehicleListing[] | null>(null);
  const [selectedId, setSelectedId] = useState(params.get("vehicle") ?? "");
  const [compareListing, setCompareListing] = useState<VehicleListing | null>(null);
  const [template, setTemplate] = useState<BrochureTemplateId>(isTemplate(params.get("template")) ? (params.get("template") as BrochureTemplateId) : "feature_highlights");
  const [templatePicked, setTemplatePicked] = useState(isTemplate(params.get("template")));
  const [size, setSize] = useState<PosterSize>("portrait");
  const [contentMap, setContentMap] = useState<Partial<Record<BrochureTemplateId, BrochureContent>>>({});
  const [branding, setBranding] = useState<BrochureBranding | null>(null);
  const [colors, setColors] = useState<BrochureColors>(COLOR_PRESETS[0]!);
  const [images, setImages] = useState<BrochureImageSelection | null>(null);
  const [angles, setAngles] = useState<PhotoAngleMap>({});
  const [anglesDirty, setAnglesDirty] = useState(false);
  const [customised, setCustomised] = useState(false);
  const [exported, setExported] = useState(false);
  const [aiBusy, setAiBusy] = useState<"" | "copy" | "highlights" | "angles">("");
  const [busy, setBusy] = useState<PreviewAction | "">("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [picker, setPicker] = useState<"send" | "save" | null>(null);
  const [presetLead, setPresetLead] = useState<StudioLead | null>(null);
  const [recent, setRecent] = useState<RecentPoster[]>([]);
  const uploaded = useRef<{ key: string; url: string } | null>(null);

  const basePath = variant === "new-car" ? "/dashboard/new-car" : "/dashboard/dealer";
  const inventoryPath = `${basePath}/inventory`;

  useEffect(() => setPageMeta({ title: "AI Brochure Studio" }), []);

  useEffect(() => {
    if (!dealer) return;
    let alive = true;
    void fetchStudioVehicles(dealer.id, user?.id).then((rows) => {
      if (!alive) return;
      setListings(rows);
      setSelectedId((cur) => (cur && rows.some((r) => r.id === cur) ? cur : rows.find((r) => r.status === "available")?.id ?? rows[0]?.id ?? ""));
    });
    setRecent(loadRecentPosters(dealer.id));
    return () => {
      alive = false;
    };
  }, [dealer, user?.id]);

  const leadParam = params.get("lead");
  useEffect(() => {
    if (!dealer || !leadParam) return;
    void fetchStudioLeads(dealer.id).then((rows) => setPresetLead(rows.find((l) => l.id === leadParam) ?? null));
  }, [dealer, leadParam]);

  const selected = listings?.find((l) => l.id === selectedId) ?? null;
  const baseVehicle = useMemo(() => (selected ? toBrochureVehicle(selected) : null), [selected]);
  const vehicle = useMemo(() => (baseVehicle ? { ...baseVehicle, angles } : null), [baseVehicle, angles]);
  const compare = useMemo(() => (compareListing ? toBrochureVehicle(compareListing) : null), [compareListing]);

  // New vehicle → fresh content, photos, angle labels; branding keeps dealer edits.
  useEffect(() => {
    if (!baseVehicle) return;
    setAngles(baseVehicle.angles);
    setAnglesDirty(false);
    setContentMap({});
    setImages(defaultImages(baseVehicle, null));
    setCompareListing(null);
    uploaded.current = null;
    if (!templatePicked) setTemplate(baseVehicle.condition === "used" ? "used_sales" : "feature_highlights");
    setBranding((b) => {
      const fresh = defaultBranding(dealer, baseVehicle, user?.phone);
      return b ? { ...b, dealerTagline: fresh.dealerTagline } : fresh;
    });
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("vehicle", baseVehicle.id);
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseVehicle?.id]);

  useEffect(() => {
    if (!dealer) return;
    setBranding((b) => (b ? { ...b, logoUrl: b.logoUrl || dealer.logoUrl || "", dealerName: b.dealerName || dealer.name, phone: b.phone || dealer.phone || "" } : b));
  }, [dealer]);

  useEffect(() => {
    setImages((img) => (img ? { ...img, compareHeroUrl: compare ? defaultImages(compare, null).heroUrl : "" } : img));
  }, [compare]);

  const contentFor = useCallback(
    (t: BrochureTemplateId) => (vehicle ? contentMap[t] ?? defaultContent(vehicle, t) : null),
    [contentMap, vehicle]
  );
  const content = contentFor(template);

  const designFor = useCallback(
    (t: BrochureTemplateId): BrochureDesign | null => {
      const c = contentFor(t);
      if (!c || !branding || !images) return null;
      return { template: t, size, content: c, branding, colors, images };
    },
    [contentFor, branding, images, colors, size]
  );
  const design = designFor(template);

  const qrText = vehicle ? listingUrl(vehicle, `${template}-${vehicle.id.slice(0, 8)}`) : "";
  const { assets, loading: assetsLoading } = usePosterAssets(design, vehicle, design?.branding.showQr ? qrText : "");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !design || !vehicle) return;
    const raf = requestAnimationFrame(() => renderPoster(canvas, design, vehicle, compare, assets));
    return () => cancelAnimationFrame(raf);
  }, [design, vehicle, compare, assets]);

  const thumbKey = JSON.stringify([branding, colors, images, contentMap, angles]);

  const editContent = (patch: Partial<BrochureContent>) => {
    if (!content) return;
    setCustomised(true);
    setContentMap((m) => ({ ...m, [template]: { ...content, ...patch } }));
  };
  const editBranding = (patch: Partial<BrochureBranding>) => {
    setCustomised(true);
    setBranding((b) => (b ? { ...b, ...patch } : b));
  };
  const editImages = (patch: Partial<BrochureImageSelection>) => {
    setCustomised(true);
    setImages((i) => (i ? { ...i, ...patch } : i));
  };

  /* ---------------- AI ---------------- */

  const runAiCopy = async () => {
    if (!vehicle) return;
    setAiBusy("copy");
    const out = await aiCopy(vehicle, template);
    setAiBusy("");
    if (!out) return toast("AI is not configured — edit the headline yourself or use the suggested one.");
    editContent({ headline: out.headline, ...(out.tagline ? { tagline: out.tagline } : {}) });
    toast.success("AI headline added");
  };

  const runAiHighlights = async () => {
    if (!vehicle) return;
    setAiBusy("highlights");
    const out = await aiHighlights(vehicle);
    setAiBusy("");
    if (!out?.length) return toast("AI is not configured — highlights are built from your listing's real specs & features.");
    editContent({ features: out, ...(template === "feature_highlights" ? { headline: `${out.length} Reasons to Choose` } : {}) });
    toast.success(`${out.length} highlights written from your listing`);
  };

  const runDetectAngles = async () => {
    if (!vehicle) return;
    setAiBusy("angles");
    const { source, angles: found } = await detectPhotoAngles(vehicle.images);
    setAiBusy("");
    if (source !== "openai") return toast("AI photo tagging is not configured — pick each photo's angle from the dropdown.");
    const count = Object.keys(found).length;
    if (!count) return toast("AI couldn't recognise these photos — label them manually.");
    const merged: PhotoAngleMap = { ...angles };
    const taken = new Set(Object.values(angles));
    for (const [url, angle] of Object.entries(found)) {
      if (merged[url] || taken.has(angle)) continue;
      merged[url] = angle;
      taken.add(angle);
    }
    setAngles(merged);
    setAnglesDirty(true);
    toast.success(`AI labelled ${count} photo${count === 1 ? "" : "s"} — review and save`);
  };

  const saveAngles = async () => {
    if (!selected || !vehicle) return;
    const clean = cleanPhotoAngles(angles, vehicle.images);
    const { error } = await savePhotoAngles(selected, clean);
    if (error) return toast.error(error.message ?? "Could not save labels");
    setListings((rows) => rows?.map((r) => (r.id === selected.id ? { ...r, metadata: { ...r.metadata, photoAngles: clean } } : r)) ?? rows);
    setAnglesDirty(false);
    toast.success("Photo labels saved — listing gallery & future posters use them");
  };

  const onLogoFile = async (file: File) => {
    if (!dealer) return;
    setLogoBusy(true);
    try {
      const { publicUrl } = await uploadFile("profile-images", `dealer-logo-${dealer.id}-${Date.now()}.png`, file);
      const { error } = await updateDealerProfile(dealer.id, { logo_url: publicUrl });
      if (error) throw new Error(error.message);
      editBranding({ logoUrl: publicUrl, showDealerLogo: true });
      void refetchDealer();
      toast.success("Logo saved to your dealership profile");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setLogoBusy(false);
    }
  };

  /* ---------------- Export & share ---------------- */

  const title = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.trim() : "Poster";

  const getBlob = async (type: "image/png" | "image/jpeg" = "image/png") => {
    const canvas = canvasRef.current;
    if (!canvas || !design || !vehicle) throw new Error("Poster not ready");
    renderPoster(canvas, design, vehicle, compare, assets);
    return canvasBlob(canvas, type);
  };

  const ensureUploaded = async () => {
    if (!dealer) throw new Error("Dealer profile not ready");
    const key = `${thumbKey}|${template}|${size}|${vehicle?.id}|${compare?.id ?? ""}`;
    if (uploaded.current?.key === key) return uploaded.current.url;
    const url = await uploadPoster(await getBlob(), dealer.id, `${title}-${template}`);
    uploaded.current = { key, url };
    setRecent(pushRecentPoster(dealer.id, { url, title, template, at: new Date().toISOString() }));
    return url;
  };

  const shareText = (posterUrl?: string) =>
    [
      `${title}${content?.priceText ? ` — ${content.priceText}` : ""}`,
      content?.tagline ?? "",
      "",
      vehicle ? `Photos & details: ${listingUrl(vehicle, "whatsapp")}` : "",
      posterUrl ? `Poster: ${absoluteUrl(posterUrl)}` : "",
      "",
      [branding?.dealerName, branding?.phone].filter(Boolean).join(" · "),
    ]
      .filter((l, i, arr) => l || (arr[i - 1] && arr[i + 1]))
      .join("\n");

  const deliverToLead = async (lead: StudioLead | null, manualPhone?: string, mode: "send" | "save" = "send") => {
    if (!dealer || !user || !vehicle) return;
    setBusy(mode === "send" ? "send" : "lead");
    try {
      const posterUrl = await ensureUploaded();
      if (lead) {
        const { error } = await attachPosterToLead({
          leadId: lead.id,
          dealerId: dealer.id,
          authorId: user.id,
          title: `${title} · ${TEMPLATE_META[template].name}`,
          posterUrl,
          listingUrl: listingUrl(vehicle, "lead"),
          sentVia: mode === "send" ? "WhatsApp" : undefined,
        });
        if (error) throw new Error(error.message);
      }
      if (mode === "send") {
        window.open(whatsappLink(lead?.phone ?? manualPhone ?? "", shareText(posterUrl)), "_blank", "noopener");
        toast.success(lead ? `WhatsApp opened for ${lead.name} — poster saved in lead notes` : "WhatsApp opened with the poster link");
      } else {
        toast.success(`Poster saved to ${lead?.name ?? "lead"}'s folder`);
      }
      setExported(true);
      setPicker(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not share poster");
    } finally {
      setBusy("");
    }
  };

  const onAction = async (action: PreviewAction) => {
    if (!vehicle || !design) return;
    if (action === "send" || action === "lead") {
      const mode = action === "send" ? "send" : "save";
      if (presetLead) return void deliverToLead(presetLead, undefined, mode);
      setPicker(mode);
      return;
    }
    setBusy(action);
    try {
      if (action === "png" || action === "jpg") {
        const blob = await getBlob(action === "png" ? "image/png" : "image/jpeg");
        downloadBlob(blob, posterFilename(`${title}-${template}`, action));
        toast.success(action === "png" ? "Poster downloaded (PNG)" : "Downloaded — upload it to Instagram");
      } else if (action === "pdf") {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Poster not ready");
        renderPoster(canvas, design, vehicle, compare, assets);
        await downloadPdf(canvas, posterFilename(`${title}-${template}`, "pdf"));
        toast.success("High-resolution PDF downloaded");
      } else if (action === "whatsapp" || action === "social") {
        const blob = await getBlob();
        const shared = await shareFile(blob, posterFilename(title, "png"), title, shareText());
        if (!shared && action === "whatsapp") {
          const url = await ensureUploaded();
          window.open(whatsappLink(null, shareText(url)), "_blank", "noopener");
          toast.success("WhatsApp opened with the poster link");
        } else if (!shared) {
          await ensureUploaded();
        }
      } else if (action === "copy") {
        const url = absoluteUrl(await ensureUploaded());
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Poster link copied");
      }
      setExported(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy("");
    }
  };

  const socialLinks = vehicle
    ? (() => {
        const u = encodeURIComponent(listingUrl(vehicle, "social"));
        const t = encodeURIComponent(`${title}${content?.priceText ? ` — ${content.priceText}` : ""}`);
        return {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
          x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
        };
      })()
    : null;

  const stepDone = [Boolean(vehicle), Boolean(vehicle), templatePicked, customised, exported];
  const activeStep = stepDone.findIndex((d) => !d);

  const Shell = variant === "new-car" ? NewCarDealerShell : DealerConsoleShell;

  return (
    <Shell
      title="AI Brochure Studio"
      description="Auto-generate professional car posters with your dealer details, logo, contact, offers and branding."
      crumbs={[{ label: "Inventory", href: inventoryPath }, { label: "AI Brochure Studio" }]}
    >
      <ol className="grid gap-2 rounded-2xl border bg-card p-3 sm:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-start gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                stepDone[i] ? "bg-primary text-primary-foreground" : i === activeStep ? "border-2 border-primary text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {stepDone[i] ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-[11px] text-muted-foreground">{s.sub}</span>
            </span>
          </li>
        ))}
      </ol>

      {presetLead ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          Creating a poster for lead <strong>{presetLead.name}</strong> ({presetLead.phone}) — “Send to customer” and “Add to lead folder” go straight to this
          lead.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <VehiclePanel
            listings={listings}
            selectedId={selectedId}
            vehicle={vehicle}
            inventoryPath={inventoryPath}
            onSelect={(id) => setSelectedId(id)}
          />
          <TemplatePanel
            vehicle={vehicle}
            compare={compare}
            assets={assets}
            selected={template}
            designFor={designFor}
            renderKey={thumbKey}
            onSelect={(t) => {
              setTemplate(t);
              setTemplatePicked(true);
              setParams(
                (p) => {
                  const next = new URLSearchParams(p);
                  next.set("template", t);
                  return next;
                },
                { replace: true }
              );
            }}
          />
          <div className="md:col-span-2">
            {vehicle && content && branding && images ? (
              <CustomisePanel
                template={template}
                vehicle={vehicle}
                content={content}
                onContent={editContent}
                branding={branding}
                onBranding={editBranding}
                colors={colors}
                onColors={(c) => {
                  setCustomised(true);
                  setColors(c);
                }}
                images={images}
                onImages={editImages}
                angles={angles}
                onAngles={(a) => {
                  setAngles(a);
                  setAnglesDirty(true);
                }}
                anglesDirty={anglesDirty}
                aiBusy={aiBusy}
                onAiCopy={() => void runAiCopy()}
                onAiHighlights={() => void runAiHighlights()}
                onDetectAngles={() => void runDetectAngles()}
                onSaveAngles={() => void saveAngles()}
                onAutoArrange={() => vehicle && editImages(defaultImages(vehicle, compare))}
                inventory={listings ?? []}
                compare={compareListing}
                onCompare={(v) => {
                  setCustomised(true);
                  setCompareListing(v);
                }}
                onLogoFile={(f) => void onLogoFile(f)}
                logoBusy={logoBusy}
              />
            ) : (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                {listings === null ? "Loading your inventory…" : "Select a vehicle to start designing."}
              </div>
            )}
          </div>
        </div>
        <PreviewPanel
          ref={canvasRef}
          size={size}
          onSize={setSize}
          busy={busy}
          loadingAssets={assetsLoading}
          disabled={!design || !vehicle}
          onAction={(a) => void onAction(a)}
          socialLinks={socialLinks}
          recent={recent}
          leadName={presetLead?.name}
        />
      </div>

      {dealer ? (
        <LeadPickerDialog
          open={picker !== null}
          mode={picker ?? "send"}
          dealerId={dealer.id}
          busy={busy === "send" || busy === "lead"}
          onOpenChange={(o) => !o && setPicker(null)}
          onPick={(lead, phone) => void deliverToLead(lead, phone, picker ?? "send")}
        />
      ) : null}
    </Shell>
  );
}

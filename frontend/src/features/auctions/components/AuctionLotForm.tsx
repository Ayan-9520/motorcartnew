import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Gavel, ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/services/storage.service";
import { useAuthStore } from "@/store/authStore";
import { createAuction } from "../services/auction.service";
import { AUCTION_ASSET_CLASSES } from "../lib/auction-utils";
import { AUCTION_TYPE_LABELS, AUCTION_TYPE_TO_CATEGORY, type AuctionType } from "../types";

export type AuctionVehicleOption = { id: string; title: string; price: number; city?: string };

type AuctionLotFormProps = {
  /** organizer = admin / auction partner (any lot, goes live on schedule); seller = dealer / customer, needs approval. */
  mode: "organizer" | "seller";
  vehicles?: AuctionVehicleOption[];
  onCreated?: () => void;
};

const DURATIONS = [
  { hours: 2, label: "2 hours" },
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

const MAX_PHOTOS = 20;
const MIN_SELLER_PHOTOS = 3;
const selectCls = "dealer-os-select mt-1 w-full";
const textareaCls = "mt-1 min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

type Details = {
  brand: string;
  model: string;
  variant: string;
  year: string;
  km_driven: string;
  fuel: string;
  transmission: string;
  owners: string;
  registration_state: string;
  registration_number: string;
  rc_status: string;
  insurance_valid_till: string;
  hypothecation: string;
  accident_history: string;
  inspection_notes: string;
};

const EMPTY_DETAILS: Details = {
  brand: "",
  model: "",
  variant: "",
  year: "",
  km_driven: "",
  fuel: "",
  transmission: "",
  owners: "",
  registration_state: "",
  registration_number: "",
  rc_status: "",
  insurance_valid_till: "",
  hypothecation: "",
  accident_history: "",
  inspection_notes: "",
};

function localNow() {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

/** Pulls the listing slug out of a pasted Motorcart vehicle URL (or accepts a raw slug / id). */
function listingKey(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return trimmed.split("/").filter(Boolean).pop() ?? trimmed;
  }
}

/** Store same-site uploads as `/uploads/...` so lots survive API host changes. */
function storedImageUrl(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith("/uploads/")) return u.pathname;
  } catch {
    /* keep as-is */
  }
  return url;
}

export function AuctionLotForm({ mode, vehicles = [], onCreated }: AuctionLotFormProps) {
  const organizer = mode === "organizer";
  const userId = useAuthStore((s) => s.user?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AuctionType>("dealer");
  const [assetClass, setAssetClass] = useState("");
  const [startPrice, setStartPrice] = useState("");
  const [reserve, setReserve] = useState("");
  const [increment, setIncrement] = useState("");
  const [startsAt, setStartsAt] = useState(localNow());
  const [hours, setHours] = useState(24);
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [imageUrls, setImageUrls] = useState("");
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [description, setDescription] = useState("");
  const [declared, setDeclared] = useState(false);
  const [saving, setSaving] = useState(false);

  const picked = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);
  const start = Number(startPrice) || 0;
  const suggestedIncrement = Math.max(1000, Math.round(start / 100 / 500) * 500);
  const endsAt = new Date(new Date(startsAt).getTime() + hours * 3600_000);
  const autoTitle = [details.year, details.brand, details.model, details.variant].filter(Boolean).join(" ");
  const needsPhotos = !organizer && !vehicleId;

  const setDetail = (key: keyof Details, value: string) => setDetails((d) => ({ ...d, [key]: value }));

  const pickVehicle = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    if (v) {
      if (!title) setTitle(v.title);
      if (!startPrice) setStartPrice(String(Math.round((v.price * 0.8) / 1000) * 1000));
      if (!reserve) setReserve(String(Math.round(v.price / 1000) * 1000));
      if (!location && v.city) setLocation(v.city);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    if (!list.length) {
      if (files?.length) toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    setUploading((n) => n + list.length);
    const stamp = Date.now();
    await Promise.all(
      list.map(async (file, i) => {
        try {
          const rand = Math.random().toString(36).slice(2, 8);
          const { publicUrl } = await uploadFile("auction-images", `${userId ?? "user"}-${stamp}-${i}-${rand}`, file);
          setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, storedImageUrl(publicUrl)] : p));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Could not upload ${file.name}`);
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const makeCover = (idx: number) =>
    setPhotos((p) => [p[idx]!, ...p.filter((_, i) => i !== idx)]);

  const resolveListing = async (): Promise<string | undefined> => {
    const key = listingKey(listingUrl);
    if (!key) return undefined;
    const { data } = await supabase.from("vehicles").select("id").eq("slug", key).maybeSingle();
    if (data?.id) return String(data.id);
    const { data: byId } = await supabase.from("vehicles").select("id").eq("id", key).maybeSingle();
    return byId?.id ? String(byId.id) : "missing";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading > 0) {
      toast.error("Wait for photos to finish uploading");
      return;
    }
    if (needsPhotos && photos.length < MIN_SELLER_PHOTOS) {
      toast.error(`Upload at least ${MIN_SELLER_PHOTOS} photos (front, back, interior)`);
      return;
    }
    if (!title.trim() && !autoTitle && !picked && !listingUrl.trim()) {
      toast.error("Add a lot title or the vehicle brand & model");
      return;
    }
    if (start < 1000) {
      toast.error("Starting price must be at least ₹1,000");
      return;
    }
    if (reserve && Number(reserve) < start) {
      toast.error("Reserve can't be below the starting price");
      return;
    }
    if (!organizer && !declared) {
      toast.error("Please confirm you own this vehicle and the details are correct");
      return;
    }
    setSaving(true);
    let linked = vehicleId || undefined;
    if (organizer && !linked && listingUrl.trim()) {
      const found = await resolveListing();
      if (found === "missing") {
        setSaving(false);
        toast.error("Couldn't find that vehicle listing — check the link");
        return;
      }
      linked = found;
    }
    const pasted = organizer
      ? imageUrls
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter((s) => /^https:\/\//i.test(s))
      : [];
    const vehicleDetails = Object.fromEntries(Object.entries(details).filter(([, v]) => String(v).trim()));
    const result = await createAuction({
      title: title.trim() || autoTitle || undefined,
      vehicle_id: linked,
      start_price: start,
      reserve_price: reserve ? Number(reserve) : null,
      bid_increment: increment ? Number(increment) : undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt.toISOString(),
      location: location.trim() || undefined,
      images: [...photos, ...pasted].slice(0, MAX_PHOTOS),
      category: organizer ? AUCTION_TYPE_TO_CATEGORY[type] : "dealer",
      description: description.trim() || undefined,
      asset_class: assetClass || undefined,
      vehicle_details: Object.keys(vehicleDetails).length ? vehicleDetails : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.status === "pending"
        ? "Submitted — Motorcart will review and approve it shortly"
        : result.status === "live"
          ? "Auction is live now"
          : "Auction scheduled"
    );
    setVehicleId("");
    setListingUrl("");
    setTitle("");
    setStartPrice("");
    setReserve("");
    setIncrement("");
    setPhotos([]);
    setImageUrls("");
    setDetails(EMPTY_DETAILS);
    setDescription("");
    setAssetClass("");
    setDeclared(false);
    setStartsAt(localNow());
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {organizer ? (
        <>
          <div className="sm:col-span-2">
            <Label>Vehicle listing link (optional)</Label>
            <Input
              className="mt-1"
              placeholder="https://motorcart.in/buy/cars/used/…"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>Auction type</Label>
            <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as AuctionType)}>
              {(Object.keys(AUCTION_TYPE_LABELS) as AuctionType[]).map((t) => (
                <option key={t} value={t}>
                  {AUCTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        vehicles.length > 0 && (
          <div className="sm:col-span-2">
            <Label>Vehicle</Label>
            <select className={selectCls} value={vehicleId} onChange={(e) => pickVehicle(e.target.value)}>
              <option value="">Enter vehicle details manually</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} — {formatCurrency(v.price)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pick one of your listings (its photos are reused) or fill the details below.
            </p>
          </div>
        )
      )}

      <div className={organizer ? "" : "sm:col-span-2"}>
        <Label>Lot title</Label>
        <Input
          className="mt-1"
          placeholder={picked?.title ?? (autoTitle || "e.g. 2021 Hyundai Creta SX Diesel")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <fieldset className="sm:col-span-2 rounded-xl border p-3">
        <legend className="px-1 text-sm font-semibold">
          Photos {needsPhotos ? `(min ${MIN_SELLER_PHOTOS})` : "(optional)"}
        </legend>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Front, back, both sides, interior, dashboard (odometer) and engine bay. First photo is the cover.
        </p>
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={src} className="relative h-20 w-28 overflow-hidden rounded-lg border bg-muted">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  title="Make cover"
                  onClick={() => makeCover(i)}
                  className="absolute left-1 top-1 rounded bg-black/60 p-0.5 text-white"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                title="Remove"
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`up-${i}`} className="flex h-20 w-28 items-center justify-center rounded-lg border bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ))}
          {photos.length + uploading < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-5 w-5" />
              Add photos
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addPhotos(e.target.files)}
        />
        {organizer && (
          <div className="mt-3">
            <Label className="text-xs">Or paste image URLs (https, one per line)</Label>
            <textarea
              className={textareaCls}
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              placeholder="Leave empty to use uploaded / listing photos"
            />
          </div>
        )}
      </fieldset>

      <fieldset className="sm:col-span-2 grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">Vehicle details</legend>
        <div>
          <Label>Brand</Label>
          <Input className="mt-1" placeholder="Hyundai" value={details.brand} onChange={(e) => setDetail("brand", e.target.value)} />
        </div>
        <div>
          <Label>Model</Label>
          <Input className="mt-1" placeholder="Creta" value={details.model} onChange={(e) => setDetail("model", e.target.value)} />
        </div>
        <div>
          <Label>Variant</Label>
          <Input className="mt-1" placeholder="SX Diesel" value={details.variant} onChange={(e) => setDetail("variant", e.target.value)} />
        </div>
        <div>
          <Label>Year</Label>
          <Input
            className="mt-1"
            type="number"
            min={1950}
            max={new Date().getFullYear() + 1}
            placeholder="2021"
            value={details.year}
            onChange={(e) => setDetail("year", e.target.value)}
          />
        </div>
        <div>
          <Label>KM driven</Label>
          <Input className="mt-1" type="number" min={0} placeholder="45000" value={details.km_driven} onChange={(e) => setDetail("km_driven", e.target.value)} />
        </div>
        <div>
          <Label>Owners</Label>
          <select className={selectCls} value={details.owners} onChange={(e) => setDetail("owners", e.target.value)}>
            <option value="">—</option>
            <option value="1">1st owner</option>
            <option value="2">2nd owner</option>
            <option value="3">3rd owner</option>
            <option value="4">4+ owners</option>
          </select>
        </div>
        <div>
          <Label>Fuel</Label>
          <select className={selectCls} value={details.fuel} onChange={(e) => setDetail("fuel", e.target.value)}>
            <option value="">—</option>
            {["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Transmission</Label>
          <select className={selectCls} value={details.transmission} onChange={(e) => setDetail("transmission", e.target.value)}>
            <option value="">—</option>
            <option>Manual</option>
            <option>Automatic</option>
          </select>
        </div>
        <div>
          <Label>Registration state</Label>
          <Input className="mt-1" placeholder="Maharashtra" value={details.registration_state} onChange={(e) => setDetail("registration_state", e.target.value)} />
        </div>
        <div>
          <Label>Registration no.</Label>
          <Input
            className="mt-1"
            placeholder="MH02AB1234"
            value={details.registration_number}
            onChange={(e) => setDetail("registration_number", e.target.value.toUpperCase())}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Shown masked to bidders.</p>
        </div>
        <div>
          <Label>RC</Label>
          <select className={selectCls} value={details.rc_status} onChange={(e) => setDetail("rc_status", e.target.value)}>
            <option value="">—</option>
            <option>Original RC available</option>
            <option>Duplicate RC</option>
            <option>RC not available</option>
          </select>
        </div>
        <div>
          <Label>Insurance valid till</Label>
          <Input className="mt-1" type="date" value={details.insurance_valid_till} onChange={(e) => setDetail("insurance_valid_till", e.target.value)} />
        </div>
        <div>
          <Label>Loan / hypothecation</Label>
          <select className={selectCls} value={details.hypothecation} onChange={(e) => setDetail("hypothecation", e.target.value)}>
            <option value="">—</option>
            <option>No loan</option>
            <option>Loan active</option>
            <option>Loan closed — NOC available</option>
          </select>
        </div>
        <div>
          <Label>Accident history</Label>
          <select className={selectCls} value={details.accident_history} onChange={(e) => setDetail("accident_history", e.target.value)}>
            <option value="">—</option>
            <option>No accident</option>
            <option>Minor repairs</option>
            <option>Major accident</option>
            <option>Flood affected</option>
          </select>
        </div>
        <div>
          <Label>Asset class</Label>
          <select className={selectCls} value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
            <option value="">Auto-detect</option>
            {AUCTION_ASSET_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <Label>Condition / inspection notes</Label>
          <textarea
            className={textareaCls}
            value={details.inspection_notes}
            onChange={(e) => setDetail("inspection_notes", e.target.value)}
            placeholder="Tyres 70%, new battery, minor scratch on rear bumper, service records available…"
          />
        </div>
      </fieldset>

      <div>
        <Label>Starting bid (₹)</Label>
        <Input className="mt-1" type="number" min={1000} step={1000} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} required />
      </div>
      <div>
        <Label>Reserve price (₹, optional)</Label>
        <Input className="mt-1" type="number" min={0} step={1000} value={reserve} onChange={(e) => setReserve(e.target.value)} />
        <p className="mt-1 text-[11px] text-muted-foreground">Minimum price you'll accept — below this the lot doesn't sell.</p>
      </div>
      <div>
        <Label>Bid increment (₹)</Label>
        <Input
          className="mt-1"
          type="number"
          min={100}
          step={100}
          placeholder={start ? String(suggestedIncrement) : "Auto"}
          value={increment}
          onChange={(e) => setIncrement(e.target.value)}
        />
      </div>
      <div>
        <Label>Vehicle location</Label>
        <Input className="mt-1" placeholder={picked?.city ?? "City / yard"} value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <Label>{organizer ? "Starts" : "Preferred start"}</Label>
        <Input className="mt-1" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </div>
      <div>
        <Label>Duration</Label>
        <select className={selectCls} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {DURATIONS.map((d) => (
            <option key={d.hours} value={d.hours}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Ends {endsAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      <div className="sm:col-span-2">
        <Label>Notes for bidders (optional)</Label>
        <textarea
          className={textareaCls}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Documents, inspection timing, pickup yard, payment terms…"
        />
      </div>

      {!organizer && (
        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="mt-0.5" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
          I confirm I am the owner (or authorised seller) of this vehicle, the details and photos are genuine, and I will
          sell to the winning bidder if the reserve price is met.
        </label>
      )}

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {organizer
            ? "Goes live automatically at the start time and closes at the end time."
            : "Motorcart reviews every lot before it goes live. You'll get a notification once approved."}
        </p>
        <Button type="submit" disabled={saving || uploading > 0} className="gap-2">
          <Gavel className="h-4 w-4" />
          {saving ? "Saving…" : organizer ? "Create auction" : "Submit for approval"}
        </Button>
      </div>
    </form>
  );
}

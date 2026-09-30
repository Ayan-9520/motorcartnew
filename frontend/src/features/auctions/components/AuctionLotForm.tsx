import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { createAuction } from "../services/auction.service";
import { AUCTION_TYPE_LABELS, AUCTION_TYPE_TO_CATEGORY, type AuctionType } from "../types";

export type AuctionVehicleOption = { id: string; title: string; price: number; city?: string };

type AuctionLotFormProps = {
  /** organizer = admin / auction partner (any lot, goes live on schedule); seller = own vehicle, needs approval. */
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

export function AuctionLotForm({ mode, vehicles = [], onCreated }: AuctionLotFormProps) {
  const organizer = mode === "organizer";
  const [vehicleId, setVehicleId] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AuctionType>("dealer");
  const [startPrice, setStartPrice] = useState("");
  const [reserve, setReserve] = useState("");
  const [increment, setIncrement] = useState("");
  const [startsAt, setStartsAt] = useState(localNow());
  const [hours, setHours] = useState(24);
  const [location, setLocation] = useState("");
  const [images, setImages] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const picked = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);
  const start = Number(startPrice) || 0;
  const suggestedIncrement = Math.max(1000, Math.round(start / 100 / 500) * 500);
  const endsAt = new Date(new Date(startsAt).getTime() + hours * 3600_000);

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
    if (!organizer && !vehicleId) {
      toast.error("Pick the vehicle you want to auction");
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
    const result = await createAuction({
      title: title.trim() || undefined,
      vehicle_id: linked,
      start_price: start,
      reserve_price: reserve ? Number(reserve) : null,
      bid_increment: increment ? Number(increment) : undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt.toISOString(),
      location: location.trim() || undefined,
      images: organizer
        ? images
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      category: organizer ? AUCTION_TYPE_TO_CATEGORY[type] : "dealer",
      description: description.trim() || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.status === "pending"
        ? "Submitted — our team will approve it shortly"
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
    setImages("");
    setDescription("");
    setStartsAt(localNow());
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {!organizer ? (
        <div className="sm:col-span-2">
          <Label>Vehicle</Label>
          <select
            className="dealer-os-select mt-1 w-full"
            value={vehicleId}
            onChange={(e) => pickVehicle(e.target.value)}
            required
          >
            <option value="">Choose from your inventory</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} — {formatCurrency(v.price)}
              </option>
            ))}
          </select>
          {!vehicles.length && (
            <p className="mt-1 text-xs text-muted-foreground">Add a live vehicle to your inventory first.</p>
          )}
        </div>
      ) : (
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
            <select
              className="dealer-os-select mt-1 w-full"
              value={type}
              onChange={(e) => setType(e.target.value as AuctionType)}
            >
              {(Object.keys(AUCTION_TYPE_LABELS) as AuctionType[]).map((t) => (
                <option key={t} value={t}>
                  {AUCTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={organizer ? "" : "sm:col-span-2"}>
        <Label>Lot title</Label>
        <Input
          className="mt-1"
          placeholder={picked?.title ?? "e.g. 2021 Hyundai Creta SX Diesel"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required={organizer && !listingUrl.trim()}
        />
      </div>

      <div>
        <Label>Starting bid (₹)</Label>
        <Input className="mt-1" type="number" min={1000} step={1000} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} required />
      </div>
      <div>
        <Label>Reserve price (₹, optional)</Label>
        <Input className="mt-1" type="number" min={0} step={1000} value={reserve} onChange={(e) => setReserve(e.target.value)} />
        <p className="mt-1 text-[11px] text-muted-foreground">Below this, the lot doesn't sell.</p>
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
        <Label>Location</Label>
        <Input className="mt-1" placeholder={picked?.city ?? "City / yard"} value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <Label>Starts</Label>
        <Input className="mt-1" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </div>
      <div>
        <Label>Duration</Label>
        <select className="dealer-os-select mt-1 w-full" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
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

      {organizer && (
        <div className="sm:col-span-2">
          <Label>Image URLs (optional — one per line)</Label>
          <textarea
            className="mt-1 min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder="Leave empty to use the vehicle listing photos"
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Label>Notes for bidders (optional)</Label>
        <textarea
          className="mt-1 min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Condition, documents, inspection, pickup yard…"
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {organizer
            ? "Goes live automatically at the start time and closes at the end time."
            : "Motorcart reviews your lot before it goes live. You'll get a notification."}
        </p>
        <Button type="submit" disabled={saving} className="gap-2">
          <Gavel className="h-4 w-4" />
          {saving ? "Saving…" : organizer ? "Create auction" : "Submit for approval"}
        </Button>
      </div>
    </form>
  );
}

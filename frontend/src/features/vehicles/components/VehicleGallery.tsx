import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VehicleColorSwatches } from "./VehicleColorSwatches";
import { paintImagesForColor, type VehiclePaintColor } from "../lib/vehicle-paint";

interface VehicleGalleryProps {
  images: string[];
  title: string;
  /** Optional paint gallery — selecting a colour swaps the main image set. */
  colors?: VehiclePaintColor[];
}

function realUrls(images: string[]): string[] {
  return (images ?? [])
    .map((u) => String(u ?? "").trim())
    .filter(
      (u) =>
        u.startsWith("http://") ||
        u.startsWith("https://") ||
        u.includes("/uploads/") ||
        u.startsWith("/media/") ||
        u.startsWith("/demo/") ||
        u.startsWith("/brand/"),
    )
    .slice(0, 12);
}

export function VehicleGallery({ images, title, colors = [] }: VehicleGalleryProps) {
  const defaultIdx = Math.max(
    0,
    colors.findIndex((c) => c.isDefault),
  );
  const [colorIdx, setColorIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [active, setActive] = useState(0);

  const list = useMemo(() => {
    const paint = colors[colorIdx];
    const fromPaint = paintImagesForColor(paint, images);
    const urls = realUrls(fromPaint.length ? fromPaint : images);
    return urls;
  }, [colors, colorIdx, images]);

  useEffect(() => {
    setActive(0);
  }, [colorIdx, list.join("|")]);

  if (!list.length && !colors.length) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground">
        <Car className="h-10 w-10 opacity-35" strokeWidth={1.25} />
        <span className="text-xs font-medium">No image uploaded</span>
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className="space-y-4">
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground">
          <Car className="h-10 w-10 opacity-35" strokeWidth={1.25} />
          <span className="text-xs font-medium">No image for this colour yet</span>
        </div>
        <VehicleColorSwatches colors={colors} selectedIndex={colorIdx} onSelect={setColorIdx} />
      </div>
    );
  }

  const prev = () => setActive((i) => (i === 0 ? list.length - 1 : i - 1));
  const next = () => setActive((i) => (i === list.length - 1 ? 0 : i + 1));
  const colorName = colors[colorIdx]?.name;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <img
          key={`${colorIdx}-${list[active]}`}
          src={list[active]}
          alt={`${title}${colorName ? ` — ${colorName}` : ""} - ${active + 1}`}
          className="h-full w-full object-cover object-center transition-opacity duration-300"
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          sizes="(max-width: 1024px) 100vw, 70vw"
        />
        {list.length > 1 && (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card"
              onClick={prev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card"
              onClick={next}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {active + 1} / {list.length}
            </span>
          </>
        )}
        {colorName ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {colorName}
          </span>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-3 top-3 rounded-full border border-border bg-card"
          onClick={() => window.open(list[active], "_blank")}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {colors.length > 0 ? (
        <VehicleColorSwatches colors={colors} selectedIndex={colorIdx} onSelect={setColorIdx} />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Paint colours not listed yet. Dealer: Edit stock → name each paint photo (e.g. Mythos Black) → Save — then
          colour circles appear here.
        </p>
      )}

      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === active ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={img} alt="" className="h-full w-full object-cover object-center" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

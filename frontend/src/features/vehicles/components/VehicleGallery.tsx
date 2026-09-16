import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VehiclePaintColor } from "../lib/vehicle-paint";

interface VehicleGalleryProps {
  images: string[];
  title: string;
  /** Kept for API compat — colour picker temporarily disabled. */
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

/** Photo gallery only — paint colour system paused for now. */
export function VehicleGallery({ images, title }: VehicleGalleryProps) {
  const [active, setActive] = useState(0);
  const list = useMemo(() => realUrls(images), [images]);

  useEffect(() => {
    setActive(0);
  }, [list.join("|")]);

  if (!list.length) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground">
        <Car className="h-10 w-10 opacity-35" strokeWidth={1.25} />
        <span className="text-xs font-medium">No image uploaded</span>
      </div>
    );
  }

  const prev = () => setActive((i) => (i === 0 ? list.length - 1 : i - 1));
  const next = () => setActive((i) => (i === list.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-4">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <img
          key={list[active]}
          src={list[active]}
          alt={`${title} - ${active + 1}`}
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

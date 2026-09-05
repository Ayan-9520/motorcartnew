import { useEffect, useRef, useState } from "react";
import { Car, Bike, Bus, Truck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { inferVehicleSegment, type VehicleSegment } from "@/lib/media/vehicle-media-registry";
import type { VehicleResolveInput } from "@/lib/media/resolve-images";
import { VehicleImageSkeleton } from "./VehicleImageSkeleton";

export type VehicleImageMeta = VehicleResolveInput;

/** Prefer first real http(s) /uploads URL only — never invent stock brand photos. */
export function vehicleImageSrc(images?: string[] | null, _meta?: VehicleImageMeta, _seed = 0): string | null {
  const list = Array.isArray(images) ? images : [];
  for (const raw of list) {
    const u = String(raw ?? "").trim();
    if (!u) continue;
    if (u.startsWith("http://") || u.startsWith("https://") || u.includes("/uploads/") || u.startsWith("/media/")) {
      return u;
    }
  }
  return null;
}

function segmentIcon(meta?: VehicleImageMeta) {
  if (!meta) return Car;
  const seg: VehicleSegment = inferVehicleSegment(meta);
  if (seg === "bikes") return Bike;
  if (seg === "trucks" || seg === "equipment") return Truck;
  if (seg === "buses") return Bus;
  if (seg === "ev") return Zap;
  return Car;
}

interface VehicleImageProps {
  src?: string;
  alt: string;
  className?: string;
  meta?: VehicleImageMeta;
  images?: string[] | null;
  sizes?: string;
}

export function VehicleImage({
  src,
  alt,
  className,
  meta,
  images,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: VehicleImageProps) {
  const fromList = vehicleImageSrc(images, meta);
  const fromSrc =
    src &&
    (src.startsWith("http://") || src.startsWith("https://") || src.includes("/uploads/") || src.startsWith("/media/"))
      ? src
      : null;
  const resolved = fromList || fromSrc;

  const [current, setCurrent] = useState<string | null>(resolved);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setCurrent(resolved);
  }, [resolved]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [current]);

  const PlaceholderIcon = segmentIcon(meta);

  if (!current || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted via-muted/80 to-primary/5 text-muted-foreground",
          className
        )}
      >
        <PlaceholderIcon className="h-10 w-10 opacity-35" strokeWidth={1.25} />
        <span className="text-[10px] font-medium">No image</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {!loaded && <VehicleImageSkeleton />}
      <img
        ref={imgRef}
        src={current}
        alt={alt}
        sizes={sizes}
        referrerPolicy="no-referrer"
        className={cn(
          "h-full w-full object-cover object-center transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
      />
    </div>
  );
}

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehiclePaintColor } from "../lib/vehicle-paint";

type Props = {
  colors: VehiclePaintColor[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
};

/** Circular paint swatches in one horizontal line (CarLelo-style). */
export function VehicleColorSwatches({ colors, selectedIndex, onSelect, className }: Props) {
  if (!colors.length) return null;
  const selected = colors[selectedIndex] ?? colors[0];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-foreground">
          {colors.length} colour{colors.length === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selected?.name}</span>
        </p>
      </div>
      <div
        className="flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-1"
        role="listbox"
        aria-label="Paint colours"
      >
        {colors.map((c, i) => {
          const active = i === selectedIndex;
          const light = isLightHex(c.hex);
          return (
            <button
              key={`${c.name}-${c.hex}-${i}`}
              type="button"
              role="option"
              aria-selected={active}
              aria-label={c.name}
              title={c.name}
              onClick={() => onSelect(i)}
              className={cn(
                "relative h-10 w-10 shrink-0 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active ? "border-foreground ring-2 ring-primary/40 scale-105" : "border-border/80",
              )}
              style={{ backgroundColor: c.hex }}
            >
              {active ? (
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    light ? "text-slate-900" : "text-white",
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

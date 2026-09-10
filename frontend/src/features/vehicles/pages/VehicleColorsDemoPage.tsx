import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { VehicleGallery } from "../components/VehicleGallery";
import { DEMO_PUNCH_EV_COLORS, DEMO_PUNCH_EV_META } from "../data/demo-punch-ev-colors";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";

/**
 * Local / staging demo — CarLelo-style colour picker with per-paint images.
 * Open: /new-cars/colors-demo
 */
export function VehicleColorsDemoPage() {
  useEffect(() => {
    setPageMeta({
      title: `${DEMO_PUNCH_EV_META.title} | Motorcart`,
      description: DEMO_PUNCH_EV_META.subtitle,
    });
  }, []);

  const names = DEMO_PUNCH_EV_COLORS.map((c) => c.name).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-10">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/new-cars" className="hover:text-primary">
            New cars
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Colors demo</span>
        </nav>

        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Paint gallery demo</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{DEMO_PUNCH_EV_META.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{DEMO_PUNCH_EV_META.subtitle}</p>
          <p className="text-sm text-muted-foreground">
            There are {DEMO_PUNCH_EV_COLORS.length} colour options available, including {names}.
          </p>
        </header>

        <VehicleGallery
          images={DEMO_PUNCH_EV_COLORS[0]?.images ?? []}
          title={`${DEMO_PUNCH_EV_META.brand} ${DEMO_PUNCH_EV_META.model}`}
          colors={DEMO_PUNCH_EV_COLORS}
        />

        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground md:p-5">
          <p className="font-semibold text-foreground">How production works</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Upload one 1600×900 WebP/JPEG per colour (ChatGPT or OEM photos).</li>
            <li>Store as colorOptions: name + hex + images[] on the listing / catalog variant.</li>
            <li>Mobile uses the same images — CSS makes them responsive (no separate mobile set required).</li>
          </ul>
          <Button className="mt-4 rounded-xl" variant="outline" asChild>
            <Link to="/new-cars">Back to new cars</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

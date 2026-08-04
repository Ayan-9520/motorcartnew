import { Link } from "react-router-dom";
import { Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PartsCatalogEmptyProps {
  hubLabel?: string | null;
  compact?: boolean;
}

export function PartsCatalogEmpty({ hubLabel, compact }: PartsCatalogEmptyProps) {
  return (
    <div className={compact ? "parts-empty-state parts-empty-state--compact" : "parts-empty-state"}>
      <span className="parts-empty-state__icon" aria-hidden>
        <Package className="h-6 w-6 text-primary" />
      </span>
      <p className="parts-empty-state__title">
        {hubLabel ? `No ${hubLabel.toLowerCase()} parts listed yet` : "No parts listed yet"}
      </p>
      <p className="parts-empty-state__desc">
        Suppliers upload SKUs at{" "}
        <Link to="/dashboard/parts/upload" className="font-medium text-primary hover:underline">
          Parts upload
        </Link>
        . GST invoices, wholesale pricing &amp; fitment tags appear here once live.
      </p>
      <div className="parts-empty-state__actions">
        <Button className="rounded-xl shadow-[var(--shadow-primary)]" size="sm" asChild>
          <Link to="/dashboard/parts/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload parts
          </Link>
        </Button>
        <Button variant="outline" className="rounded-xl" size="sm" asChild>
          <Link to="/parts/browse">Browse catalogue</Link>
        </Button>
      </div>
    </div>
  );
}

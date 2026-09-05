import { Badge } from "@/components/ui/badge";
import type { QuotationStatus } from "../types";

const LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  accepted: "Accepted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <Badge variant="outline" className="capitalize">
      {LABELS[status] ?? status}
    </Badge>
  );
}

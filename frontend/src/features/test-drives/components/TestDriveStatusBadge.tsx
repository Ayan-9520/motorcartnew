import { Badge } from "@/components/ui/badge";
import type { TestDriveStatus } from "../types";

const LABELS: Record<TestDriveStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  no_show: "No-show",
};

export function TestDriveStatusBadge({ status }: { status: TestDriveStatus }) {
  return (
    <Badge variant="outline" className="capitalize">
      {LABELS[status] ?? status}
    </Badge>
  );
}

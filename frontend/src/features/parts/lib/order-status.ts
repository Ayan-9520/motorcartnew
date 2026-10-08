import type { PartOrderStatus } from "../types";

export const PART_ORDER_STATUS_LABELS: Record<PartOrderStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function partOrderStatusTone(status: PartOrderStatus): string {
  switch (status) {
    case "delivered":
      return "border-0 bg-primary text-primary-foreground";
    case "cancelled":
      return "border-0 bg-destructive text-destructive-foreground";
    case "shipped":
      return "border-0 bg-sky-600 text-white";
    case "pending":
      return "border-0 bg-amber-500 text-white";
    default:
      return "border-0 bg-secondary text-secondary-foreground";
  }
}

export type VehicleSaleMode =
  | "direct_owner"
  | "broker_assisted"
  | "dealer_offer"
  | "auction_sale";

export const SALE_MODE_OPTIONS: { value: VehicleSaleMode; label: string }[] = [
  { value: "direct_owner", label: "Direct Owner Sale" },
  { value: "broker_assisted", label: "Broker Assisted Sale" },
  { value: "dealer_offer", label: "Dealer Offer" },
  { value: "auction_sale", label: "Auction Sale" },
];

export const SALE_MODE_LABELS: Record<VehicleSaleMode, string> = {
  direct_owner: "Owner Sale",
  broker_assisted: "Broker Assisted",
  dealer_offer: "Dealer Offer",
  auction_sale: "Auction",
};

const VALID: VehicleSaleMode[] = [
  "direct_owner",
  "broker_assisted",
  "dealer_offer",
  "auction_sale",
];

export function resolveSaleMode(
  saleMode?: string | null,
  metadata?: Record<string, unknown>
): VehicleSaleMode {
  const fromMeta = metadata?.saleMode ?? metadata?.sale_mode;
  const raw = (saleMode ?? fromMeta ?? "dealer_offer") as string;
  return VALID.includes(raw as VehicleSaleMode) ? (raw as VehicleSaleMode) : "dealer_offer";
}

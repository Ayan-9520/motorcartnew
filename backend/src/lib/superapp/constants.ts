export const SUPERAPP_NEVER_ALLOW_TABLES = [
  "motorcart_identities",
  "motorcart_one_tokens",
  "saved_searches",
  "saved_search_matches",
  "vehicle_media_assets",
  "vehicle_sale_requests",
  "vehicle_valuations",
  "vehicle_purchase_offers",
  "scheduled_reminders",
] as const;

export const SALE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "OPEN_FOR_OFFERS",
  "OFFER_ACCEPTED",
  "CLOSED",
  "CANCELLED",
] as const;

export const OFFER_STATUSES = ["ACTIVE", "WITHDRAWN", "EXPIRED", "ACCEPTED", "REJECTED"] as const;

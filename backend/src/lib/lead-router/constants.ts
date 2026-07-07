import type { LeadDestination, LeadSource } from "./types";

/** Maps business entity_type → router destination (no CRM module calls). */
export const ENTITY_TYPE_TO_DESTINATION: Record<string, LeadDestination> = {
  dealer: "dealer",
  broker: "broker",
  dsa: "dsa",
  insurance_agent: "insurance_agent",
  workshop: "workshop",
  parts_seller: "parts_seller",
  influencer: "dealer",
  service_center: "workshop",
  service_partner: "workshop",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  marketplace: "Marketplace Lead",
  directory: "Directory Lead",
  community: "Community Lead",
  campaign: "Growth Campaign Lead",
  auction: "Auction Lead",
};

export const DESTINATION_LABELS: Record<LeadDestination, string> = {
  dealer: "Dealer",
  broker: "Broker",
  dsa: "DSA",
  insurance_agent: "Insurance Agent",
  workshop: "Workshop",
  parts_seller: "Parts Seller",
};

export const ROUTER_CONFIG = {
  storage: "json_file",
  max_records: 10_000,
  id_prefix: "ul_",
  note: "Routing layer only — does not move or mutate existing CRM leads.",
} as const;

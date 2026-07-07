export const LEAD_SOURCES = [
  "marketplace",
  "directory",
  "community",
  "campaign",
  "auction",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_DESTINATIONS = [
  "dealer",
  "broker",
  "dsa",
  "insurance_agent",
  "workshop",
  "parts_seller",
] as const;

export type LeadDestination = (typeof LEAD_DESTINATIONS)[number];

export const LEAD_ROUTER_STATUSES = [
  "new",
  "routed",
  "delivered",
  "failed",
] as const;

export type LeadRouterStatus = (typeof LEAD_ROUTER_STATUSES)[number];

export type LeadOwnership = {
  owner_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  business_profile_id: string | null;
};

export type LeadContact = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type NativeLeadRef = {
  source_module: string;
  native_id: string | null;
};

export type LeadHistoryEvent = {
  at: string;
  status: LeadRouterStatus;
  note?: string | null;
};

export type UnifiedLeadRecord = {
  id: string;
  source: LeadSource;
  destination: LeadDestination;
  status: LeadRouterStatus;
  ownership: LeadOwnership;
  contact: LeadContact;
  intent: string | null;
  attribution: Record<string, unknown>;
  native_ref: NativeLeadRef | null;
  created_at: string;
  updated_at: string;
  history: LeadHistoryEvent[];
};

export type RouteLeadInput = {
  source: string;
  contact?: LeadContact;
  intent?: string | null;
  ownership?: Partial<LeadOwnership>;
  attribution?: Record<string, unknown>;
  native_ref?: { source_module?: string; native_id?: string | null };
  destination?: string;
};

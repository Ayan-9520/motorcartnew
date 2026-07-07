import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  DESTINATION_LABELS,
  ENTITY_TYPE_TO_DESTINATION,
  ROUTER_CONFIG,
  SOURCE_LABELS,
} from "@/lib/lead-router/constants";
import {
  appendLead,
  countStoredLeads,
  listStoredLeads,
} from "@/lib/lead-router/store";
import {
  LEAD_DESTINATIONS,
  LEAD_ROUTER_STATUSES,
  LEAD_SOURCES,
  type LeadDestination,
  type LeadRouterStatus,
  type LeadSource,
  type RouteLeadInput,
  type UnifiedLeadRecord,
} from "@/lib/lead-router/types";

function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}

function isLeadDestination(v: string): v is LeadDestination {
  return (LEAD_DESTINATIONS as readonly string[]).includes(v);
}

function resolveDestination(
  entityType: string | null | undefined,
  explicit?: string | null
): LeadDestination {
  if (explicit && isLeadDestination(explicit)) return explicit;
  if (entityType && ENTITY_TYPE_TO_DESTINATION[entityType]) {
    return ENTITY_TYPE_TO_DESTINATION[entityType];
  }
  return "dealer";
}

function normalizeContact(raw?: RouteLeadInput["contact"]) {
  return {
    name: raw?.name != null ? String(raw.name).trim() : null,
    phone: raw?.phone != null ? String(raw.phone).trim() : null,
    email: raw?.email != null ? String(raw.email).trim() : null,
  };
}

function generateUnifiedLeadId(): string {
  return `${ROUTER_CONFIG.id_prefix}${randomUUID()}`;
}

export async function routeLead(input: RouteLeadInput): Promise<UnifiedLeadRecord> {
  const sourceRaw = String(input.source ?? "").toLowerCase();
  if (!isLeadSource(sourceRaw)) {
    throw new Error(`INVALID_SOURCE: must be one of ${LEAD_SOURCES.join(", ")}`);
  }

  const ownership = {
    owner_user_id: input.ownership?.owner_user_id ?? null,
    entity_type: input.ownership?.entity_type ?? null,
    entity_id: input.ownership?.entity_id ?? null,
    business_profile_id: input.ownership?.business_profile_id ?? null,
  };

  if (ownership.business_profile_id && !ownership.entity_type) {
    const profile = await prisma.communityBusinessProfile.findFirst({
      where: { id: ownership.business_profile_id },
    });
    if (profile) {
      ownership.owner_user_id = profile.ownerUserId;
      ownership.entity_type = profile.entityType;
      ownership.entity_id = profile.entityId;
    }
  }

  const destination = resolveDestination(ownership.entity_type, input.destination);
  const now = new Date().toISOString();

  const record: UnifiedLeadRecord = {
    id: generateUnifiedLeadId(),
    source: sourceRaw,
    destination,
    status: "routed",
    ownership,
    contact: normalizeContact(input.contact),
    intent: input.intent != null ? String(input.intent) : null,
    attribution:
      input.attribution && typeof input.attribution === "object" ? input.attribution : {},
    native_ref: input.native_ref
      ? {
          source_module: String(input.native_ref.source_module ?? sourceRaw),
          native_id:
            input.native_ref.native_id != null ? String(input.native_ref.native_id) : null,
        }
      : null,
    created_at: now,
    updated_at: now,
    history: [
      { at: now, status: "new", note: "ingress" },
      {
        at: now,
        status: "routed",
        note: `destination:${destination}`,
      },
    ],
  };

  await appendLead(record);
  return record;
}

export async function getLeadRouterOverview() {
  const [storedCount, leads, growthEvents, marketplaceLeads, dealerLeads] = await Promise.all([
    countStoredLeads(),
    listStoredLeads(5000),
    prisma.growthLeadCaptureEvent.count().catch(() => 0),
    prisma.lead.count().catch(() => 0),
    prisma.dealerLead.count().catch(() => 0),
  ]);

  const bySource: Record<string, number> = {};
  const byDestination: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const s of LEAD_SOURCES) bySource[s] = 0;
  for (const d of LEAD_DESTINATIONS) byDestination[d] = 0;
  for (const st of LEAD_ROUTER_STATUSES) byStatus[st] = 0;

  for (const l of leads) {
    bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    byDestination[l.destination] = (byDestination[l.destination] ?? 0) + 1;
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  }

  return {
    config: ROUTER_CONFIG,
    sources: LEAD_SOURCES.map((id) => ({
      id,
      label: SOURCE_LABELS[id],
    })),
    destinations: LEAD_DESTINATIONS.map((id) => ({
      id,
      label: DESTINATION_LABELS[id],
    })),
    routed_leads: {
      total: storedCount,
      by_source: bySource,
      by_destination: byDestination,
      by_status: byStatus,
    },
    external_counts_readonly: {
      note: "Existing CRM rows are not moved or modified.",
      growth_lead_capture_events: growthEvents,
      marketplace_leads_table: marketplaceLeads,
      dealer_leads_table: dealerLeads,
    },
  };
}

export async function getLeadRouterHistory(params?: {
  source?: string;
  destination?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(params?.limit ?? 100, 500);
  const offset = params?.offset ?? 0;
  let rows = await listStoredLeads(10_000, 0);

  if (params?.source && isLeadSource(params.source)) {
    rows = rows.filter((r) => r.source === params.source);
  }
  if (params?.destination && isLeadDestination(params.destination)) {
    rows = rows.filter((r) => r.destination === params.destination);
  }
  if (params?.status && (LEAD_ROUTER_STATUSES as readonly string[]).includes(params.status)) {
    rows = rows.filter((r) => r.status === params.status);
  }

  const total = rows.length;
  const items = rows.slice(offset, offset + limit);

  return {
    total,
    limit,
    offset,
    items,
  };
}

export function entityTypeToDestination(entityType: string) {
  return ENTITY_TYPE_TO_DESTINATION[String(entityType)] ?? "dealer";
}

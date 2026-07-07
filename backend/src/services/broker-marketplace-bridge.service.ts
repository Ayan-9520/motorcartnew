import { featureFlags } from "@/config/feature-flags";
import { prisma } from "@/lib/prisma";
import { createBrokerLead } from "@/services/broker-lead.service";

/**
 * Optional copy-only bridge: reads dealer `leads` row, inserts `broker_leads`.
 * Never updates `leads`. Not wired to POST /api/leads — call only when
 * FEATURE_BROKER_MARKETPLACE_BRIDGE is enabled.
 */
export async function copyDealerLeadToBrokerLead(input: {
  brokerId: string;
  marketplaceLeadId: string;
}) {
  if (!featureFlags.brokerMarketplaceBridge) {
    throw new Error("Marketplace bridge disabled");
  }

  const dealerLead = await prisma.lead.findUnique({
    where: { id: input.marketplaceLeadId },
  });
  if (!dealerLead) throw new Error("Marketplace lead not found");

  const vehicle = dealerLead.vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: dealerLead.vehicleId },
        select: { slug: true, saleMode: true },
      })
    : null;

  const meta = (dealerLead.metadata ?? {}) as Record<string, unknown>;

  return createBrokerLead(input.brokerId, {
    name: dealerLead.name,
    phone: dealerLead.phone,
    email: dealerLead.email,
    source: "marketplace_bridge",
    status: "new",
    vehicleInterest: dealerLead.vehicleInterest,
    vehicleId: dealerLead.vehicleId,
    vehicleSlug: (meta.vehicle_slug as string) ?? vehicle?.slug ?? null,
    saleMode: vehicle?.saleMode ?? "broker_assisted",
    notes: dealerLead.notes,
    metadata: {
      marketplace_lead_id: dealerLead.id,
      bridged_at: new Date().toISOString(),
    },
  });
}

import { prisma } from "@/lib/prisma";
import { createCustomerEnquiry } from "@/lib/leads/enquiry.service";
import type { CustomerEnquiryInput } from "@/lib/leads/enquiry.types";

export type MarketplaceLeadInput = CustomerEnquiryInput;

/** Compatibility wrapper — marketplace enquiries now use the common lead adaptor. */
export async function createMarketplaceLead(input: MarketplaceLeadInput) {
  const result = await createCustomerEnquiry(input);
  return result.lead;
}

export async function resolveDealerForLead(input: MarketplaceLeadInput) {
  if (input.dealer_id) {
    const byId = await prisma.dealer.findFirst({
      where: { id: input.dealer_id, deletedAt: null },
    });
    if (byId) return byId;
  }
  if (input.dealer_slug) {
    const bySlug = await prisma.dealer.findFirst({
      where: { slug: input.dealer_slug, deletedAt: null },
    });
    if (bySlug) return bySlug;
  }
  return null;
}

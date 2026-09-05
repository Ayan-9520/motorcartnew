import { maskEmail, maskName, maskPhone } from "./pii";

export function publicBoardCard(input: {
  id: string;
  leadId: string;
  status: string;
  routingMode: string;
  creditCost: number;
  sharedLimit: number;
  acquireCount: number;
  productCategory: string | null;
  city: string | null;
  pincode: string | null;
  publishedAt: Date;
  lead: { name: string; phone: string; vehicleInterest: string | null; quality: string; createdAt: Date; source: string | null };
}) {
  return {
    id: input.id,
    lead_ref: input.leadId.slice(0, 8),
    status: input.status,
    sharing_mode: input.routingMode,
    credit_cost: input.creditCost,
    remaining_slots: Math.max(0, input.sharedLimit - input.acquireCount),
    product_category: input.productCategory,
    city: input.city,
    pincode: input.pincode,
    quality: input.lead.quality,
    age_hours: Math.max(0, Math.round((Date.now() - input.lead.createdAt.getTime()) / 3600000)),
    vehicle_interest: input.lead.vehicleInterest,
    source: input.lead.source,
    customer: maskName(input.lead.name),
    phone: maskPhone(input.lead.phone),
    published_at: input.publishedAt.toISOString(),
  };
}

export function acquiredLeadContact(lead: { name: string; phone: string; email: string | null }) {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
  };
}

export { maskEmail, maskName, maskPhone };

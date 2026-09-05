import { asRecord } from "./json";

/** Own enquiries: JWT user id in metadata, or unmatched phone/email with no other owner. */
export function isOwnEnquiry(
  userId: string,
  userPhone: string | null | undefined,
  userEmail: string | null | undefined,
  lead: { phone: string; email: string | null; metadata: unknown },
): boolean {
  const meta = asRecord(lead.metadata);
  const owner = typeof meta.customer_user_id === "string" ? meta.customer_user_id : null;
  if (owner) return owner === userId;
  const phone = userPhone?.replace(/\D/g, "").slice(-10);
  const leadPhone = lead.phone.replace(/\D/g, "").slice(-10);
  if (phone && leadPhone === phone) return true;
  if (userEmail && lead.email && lead.email.toLowerCase() === userEmail.toLowerCase()) return true;
  return false;
}

export function stripClientOwnerFields(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  delete next.customer_user_id;
  delete next.user_id;
  delete next.userId;
  return next;
}

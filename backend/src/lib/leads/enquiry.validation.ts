import type { CustomerEnquiryInput } from "./enquiry.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_METHODS = new Set(["phone", "email", "whatsapp"]);

export type EnquiryValidation =
  | { ok: true; value: ValidatedEnquiry }
  | { ok: false; message: string };

export type ValidatedEnquiry = {
  name: string;
  phone: string;
  email: string | null;
  source: string;
  notes: string | null;
  vehicleIdRaw: string | null;
  vehicleTitle: string | null;
  vehicleSlug: string | null;
  dealerIdRaw: string | null;
  dealerSlug: string | null;
  category: string | null;
  location: string | null;
  preferredContact: string | null;
  consent: boolean | null;
  metadata: Record<string, unknown>;
};

export function normalizeEnquiryPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function isValidEnquiryPhone(phone: string): boolean {
  return /^\d{10}$/.test(normalizeEnquiryPhone(phone));
}

export function validateEnquiryInput(input: CustomerEnquiryInput): EnquiryValidation {
  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, message: "Name must be between 2 and 80 characters" };
  }

  const phone = normalizeEnquiryPhone(input.phone ?? "");
  if (!isValidEnquiryPhone(phone)) {
    return { ok: false, message: "A valid 10-digit phone number is required" };
  }

  const emailRaw = input.email?.trim() ?? "";
  if (emailRaw && !EMAIL_RE.test(emailRaw)) {
    return { ok: false, message: "A valid email address is required" };
  }

  if (input.consent === false) {
    return { ok: false, message: "Consent is required to submit an enquiry" };
  }

  const preferred = (input.preferred_contact ?? "").trim().toLowerCase();
  if (preferred && !CONTACT_METHODS.has(preferred)) {
    return { ok: false, message: "Preferred contact must be phone, email, or whatsapp" };
  }

  const notes = (input.message ?? input.notes ?? "").trim();
  if (notes.length > 2000) {
    return { ok: false, message: "Message is too long" };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      email: emailRaw || null,
      source: (input.source ?? "website").trim().slice(0, 64) || "website",
      notes: notes || null,
      vehicleIdRaw: input.vehicle_id?.trim() || null,
      vehicleTitle: input.vehicle_title?.trim() || null,
      vehicleSlug: input.vehicle_slug?.trim() || null,
      dealerIdRaw: input.dealer_id?.trim() || null,
      dealerSlug: input.dealer_slug?.trim() || null,
      category: input.category?.trim() || null,
      location: input.location?.trim() || null,
      preferredContact: preferred || null,
      consent: input.consent === undefined ? null : input.consent,
      metadata: input.metadata ?? {},
    },
  };
}

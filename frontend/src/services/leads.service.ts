import { api, apiErrorMessage } from "@/lib/api/axios";
import type { VehicleEnquiry, TestDriveBooking } from "@/types/vehicle";

export type EnquirySubmitResult = {
  error: string | null;
  assignment?: "assigned" | "unassigned";
  duplicate?: boolean;
};

export async function postMarketplaceLead(payload: {
  dealer_id?: string;
  dealer_slug?: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  notes?: string;
  message?: string;
  vehicle_id?: string;
  vehicle_title?: string;
  vehicle_slug?: string;
  category?: string;
  location?: string;
  consent?: boolean;
  preferred_contact?: string;
  metadata?: Record<string, unknown>;
}): Promise<EnquirySubmitResult> {
  try {
    const { data } = await api.post<{
      assignment?: "assigned" | "unassigned";
      duplicate?: boolean;
    }>("/api/leads", payload);
    return {
      error: null,
      assignment: data?.assignment,
      duplicate: data?.duplicate,
    };
  } catch (err) {
    return { error: apiErrorMessage(err) };
  }
}

export async function submitVehicleEnquiry(enquiry: VehicleEnquiry): Promise<EnquirySubmitResult> {
  return postMarketplaceLead({
    dealer_id: enquiry.dealerId,
    dealer_slug: enquiry.dealerSlug,
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    source: enquiry.source ?? "website",
    notes: enquiry.message,
    message: enquiry.message,
    vehicle_id: enquiry.vehicleId,
    vehicle_title: enquiry.vehicleTitle,
    vehicle_slug: enquiry.vehicleSlug,
    category: enquiry.category,
    location: enquiry.location,
    consent: enquiry.consent,
    preferred_contact: enquiry.preferredContact,
    metadata: { type: "enquiry" },
  });
}

export async function submitTestDrive(
  booking: TestDriveBooking & { dealerId?: string; dealerSlug?: string; vehicleTitle?: string; vehicleSlug?: string }
): Promise<EnquirySubmitResult> {
  return postMarketplaceLead({
    dealer_id: booking.dealerId,
    dealer_slug: booking.dealerSlug,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    source: "test_drive",
    notes: `${booking.preferredDate} ${booking.preferredTime}. ${booking.message ?? ""}`.trim(),
    vehicle_id: booking.vehicleId,
    vehicle_title: booking.vehicleTitle,
    vehicle_slug: booking.vehicleSlug,
    metadata: {
      type: "test_drive",
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
    },
  });
}

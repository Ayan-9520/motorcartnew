import { api, apiErrorMessage } from "@/lib/api/axios";
import { getApiBaseUrl, hasConfiguredApi } from "@/lib/api/base-url";
import type { VehicleEnquiry, TestDriveBooking } from "@/types/vehicle";

export async function postMarketplaceLead(payload: {
  dealer_id?: string;
  dealer_slug?: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  notes?: string;
  vehicle_id?: string;
  vehicle_title?: string;
  vehicle_slug?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ error: string | null }> {
  if (!hasConfiguredApi()) {
    return {
      error: "API not configured. Set VITE_API_URL=http://localhost:3001 in frontend/.env.local and restart npm run dev",
    };
  }

  try {
    await api.post("/api/leads", payload, { baseURL: getApiBaseUrl() });
    return { error: null };
  } catch (err) {
    return { error: apiErrorMessage(err) };
  }
}

export async function submitVehicleEnquiry(enquiry: VehicleEnquiry): Promise<{ error: string | null }> {
  return postMarketplaceLead({
    dealer_id: enquiry.dealerId,
    dealer_slug: enquiry.dealerSlug,
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    notes: enquiry.message,
    vehicle_id: enquiry.vehicleId,
    vehicle_title: enquiry.vehicleTitle,
    vehicle_slug: enquiry.vehicleSlug,
    metadata: { type: "enquiry" },
  });
}

export async function submitTestDrive(
  booking: TestDriveBooking & { dealerId?: string; dealerSlug?: string; vehicleTitle?: string; vehicleSlug?: string }
): Promise<{ error: string | null }> {
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

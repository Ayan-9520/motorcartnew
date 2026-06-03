import { prisma } from "@/lib/prisma";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Mock catalog dealer ids → showroom slugs (matches frontend DEALERS_MASTER). */
const MOCK_DEALER_SLUGS: Record<string, string> = {
  "d-mumbai-1": "automax-mumbai",
  "d-mumbai-2": "premium-cars-mumbai",
  "d-delhi-1": "capital-wheels-delhi",
  "d-delhi-2": "maruti-arena-delhi",
  "d-blr-1": "greendrive-bangalore",
  "d-blr-2": "south-india-motors",
  "d-hyd-1": "fleet-masters-hyd",
  "d-chennai-1": "southern-wheels",
  "d-pune-1": "bikehub-pune",
  "d-pune-2": "commercial-motors-pune",
  "d-ahm-1": "toyota-plus-ahmedabad",
  "d-kol-1": "kia-kolkata",
  "d-jaipur-1": "ev-junction-jaipur",
  "d-luck-1": "heartland-autos",
};

export type MarketplaceLeadInput = {
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
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : phone.trim();
}

async function fallbackDealerOwnerId(): Promise<string> {
  const demo = await prisma.user.findFirst({
    where: { email: "dealer@gmail.com" },
    select: { id: true },
  });
  if (demo) return demo.id;
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["super_admin", "admin"] } },
    select: { id: true },
  });
  if (!admin) throw new Error("No dealer owner configured — run database seed");
  return admin.id;
}

export async function resolveDealerForLead(input: MarketplaceLeadInput) {
  if (input.dealer_id && UUID_RE.test(input.dealer_id)) {
    const byId = await prisma.dealer.findFirst({ where: { id: input.dealer_id, deletedAt: null } });
    if (byId) return byId;
  }

  const slug =
    input.dealer_slug?.trim() ||
    (input.dealer_id ? MOCK_DEALER_SLUGS[input.dealer_id] : undefined);

  if (slug) {
    const bySlug = await prisma.dealer.findFirst({ where: { slug, deletedAt: null } });
    if (bySlug) return bySlug;
  }

  if (slug) {
    const ownerId = await fallbackDealerOwnerId();
    return prisma.dealer.create({
      data: {
        ownerId,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        slug,
        city: "Mumbai",
        state: "Maharashtra",
        isVerified: true,
        verificationStatus: "verified",
      },
    });
  }

  throw new Error("Dealer not found for this listing");
}

export async function createMarketplaceLead(input: MarketplaceLeadInput) {
  const dealer = await resolveDealerForLead(input);
  const vehicleId =
    input.vehicle_id && UUID_RE.test(input.vehicle_id) ? input.vehicle_id : undefined;

  const metadata = {
    ...(input.metadata ?? {}),
    vehicle_slug: input.vehicle_slug,
    vehicle_title: input.vehicle_title,
    mock_vehicle_id: input.vehicle_id && !vehicleId ? input.vehicle_id : undefined,
  };

  const lead = await prisma.lead.create({
    data: {
      dealerId: dealer.id,
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.trim() || null,
      source: input.source ?? "website",
      status: "new",
      vehicleId,
      vehicleInterest: input.vehicle_title?.trim() || null,
      notes: input.notes?.trim() || null,
      metadata,
    },
  });

  const owner = await prisma.dealer.findUnique({
    where: { id: dealer.id },
    select: { ownerId: true, name: true },
  });

  if (owner?.ownerId) {
    await prisma.notification.create({
      data: {
        userId: owner.ownerId,
        title: "New customer enquiry",
        body: `${lead.name} enquired about ${input.vehicle_title ?? "a vehicle"}`,
        message: `${lead.name} · ${lead.phone}`,
        kind: "lead",
        payload: { leadId: lead.id, dealerId: dealer.id, source: lead.source },
      },
    });
  }

  return lead;
}

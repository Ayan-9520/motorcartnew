import { getVehicleHero } from "@/lib/media/vehicle-media-registry";
import type { NewCarDealerSnapshot, NcdLeadStage } from "../types";

const STAGES: NcdLeadStage[] = [
  "new",
  "contacted",
  "interested",
  "test_drive",
  "negotiation",
  "finance",
  "booking",
  "delivered",
  "lost",
];

function img(brand: string, model: string, body = "SUV", fuel = "petrol") {
  return getVehicleHero({ brand, model, bodyType: body, fuelType: fuel });
}

export function buildMockNewCarDealerSnapshot(dealerName = "Hyundai Arena Pune"): NewCarDealerSnapshot {
  const showroom = {
    id: "showroom-1",
    name: dealerName,
    brand: "Hyundai",
    city: "Pune",
    status: "live" as const,
    monthlyTarget: 85,
    monthlyAchieved: 52,
    carsSoldMtd: 52,
  };

  const inventory = [
    {
      id: "inv-creta",
      brand: "Hyundai",
      model: "Creta",
      variant: "SX(O) 1.5 Turbo DCT",
      fuelType: "Petrol",
      transmission: "DCT",
      exShowroomPrice: 1899000,
      onRoadPrice: 2185000,
      discountAmount: 45000,
      stockStatus: "available" as const,
      stockHealth: "fast_moving" as const,
      colors: ["Atlas White", "Titan Grey", "Fiery Red"],
      expectedDeliveryDays: 14,
      mileage: "17.4 kmpl",
      seating: 5,
      imageUrl: img("Hyundai", "Creta", "SUV", "petrol"),
    },
    {
      id: "inv-verna",
      brand: "Hyundai",
      model: "Verna",
      variant: "SX Turbo DCT",
      fuelType: "Petrol",
      transmission: "DCT",
      exShowroomPrice: 1650000,
      onRoadPrice: 1912000,
      discountAmount: 35000,
      stockStatus: "booked" as const,
      stockHealth: "fast_moving" as const,
      colors: ["Starry Night", "Typhoon Silver"],
      expectedDeliveryDays: 21,
      mileage: "18.6 kmpl",
      seating: 5,
      imageUrl: img("Hyundai", "Verna", "Sedan"),
    },
    {
      id: "inv-venue",
      brand: "Hyundai",
      model: "Venue",
      variant: "SX(O) Knight",
      fuelType: "Diesel",
      transmission: "Manual",
      exShowroomPrice: 1280000,
      onRoadPrice: 1498000,
      discountAmount: 25000,
      stockStatus: "transit" as const,
      stockHealth: "slow_moving" as const,
      colors: ["Knight Black"],
      expectedDeliveryDays: 7,
      imageUrl: img("Hyundai", "Venue", "SUV", "diesel"),
    },
    {
      id: "inv-exter",
      brand: "Hyundai",
      model: "Exter",
      variant: "SX AMT",
      fuelType: "Petrol",
      transmission: "AMT",
      exShowroomPrice: 999000,
      onRoadPrice: 1165000,
      discountAmount: 15000,
      stockStatus: "available" as const,
      stockHealth: "fast_moving" as const,
      colors: ["Cyan Blue", "Cosmic Gold"],
      mileage: "19.2 kmpl",
      seating: 5,
      imageUrl: img("Hyundai", "Exter", "SUV"),
    },
    {
      id: "inv-alcazar",
      brand: "Hyundai",
      model: "Alcazar",
      variant: "Signature AT",
      fuelType: "Diesel",
      transmission: "Automatic",
      exShowroomPrice: 2149000,
      onRoadPrice: 2480000,
      discountAmount: 55000,
      stockStatus: "upcoming" as const,
      stockHealth: "fast_moving" as const,
      colors: ["Atlas White"],
      expectedDeliveryDays: 45,
      seating: 7,
      imageUrl: img("Hyundai", "Alcazar", "SUV", "diesel"),
    },
  ];

  const leads = [
    {
      id: "lead-1",
      customerName: "Rahul Mehta",
      phone: "+91 98765 43210",
      email: "rahul@email.com",
      city: "Pune",
      source: "WhatsApp",
      stage: "test_drive" as const,
      preferredBrand: "Hyundai",
      preferredModel: "Creta",
      budgetMax: 2200000,
      tradeIn: "2019 i20",
      financeInterest: true,
      insuranceInterest: true,
      assignedTo: "Priya Sharma",
      score: 88,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "lead-2",
      customerName: "Anita Desai",
      phone: "+91 91234 56789",
      city: "Pimpri",
      source: "Meta ads",
      stage: "negotiation" as const,
      preferredBrand: "Hyundai",
      preferredModel: "Verna",
      budgetMax: 2000000,
      financeInterest: true,
      insuranceInterest: false,
      assignedTo: "Vikram Patil",
      score: 76,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "lead-3",
      customerName: "Suresh Kulkarni",
      phone: "+91 99887 76655",
      city: "Hinjewadi",
      source: "Walk-in",
      stage: "finance" as const,
      preferredBrand: "Hyundai",
      preferredModel: "Alcazar",
      budgetMax: 2600000,
      tradeIn: "2018 Innova",
      financeInterest: true,
      insuranceInterest: true,
      assignedTo: "Priya Sharma",
      score: 92,
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: "lead-4",
      customerName: "Neha Joshi",
      phone: "+91 97654 32109",
      city: "Baner",
      source: "CarDekho API",
      stage: "new" as const,
      preferredBrand: "Hyundai",
      preferredModel: "Venue",
      budgetMax: 1500000,
      financeInterest: false,
      insuranceInterest: true,
      assignedTo: "Vikram Patil",
      score: 54,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "lead-5",
      customerName: "Karan Shah",
      phone: "+91 90123 45678",
      city: "Kothrud",
      source: "Google ads",
      stage: "booking" as const,
      preferredBrand: "Hyundai",
      preferredModel: "Creta",
      budgetMax: 2300000,
      financeInterest: true,
      insuranceInterest: true,
      assignedTo: "Priya Sharma",
      score: 95,
      createdAt: new Date(Date.now() - 604800000).toISOString(),
    },
  ];

  const hotLeadsCount = leads.filter((l) =>
    ["new", "interested", "test_drive", "negotiation"].includes(l.stage)
  ).length;

  const metrics = [
    { key: "revenue", label: "Monthly revenue", value: "₹11.2Cr", sublabel: "MTD billed", trend: 12.4, trendLabel: "vs last month", variant: "premium" as const },
    { key: "sold", label: "Cars sold", value: 52, sublabel: `Target ${showroom.monthlyTarget}`, trend: 8.1, variant: "success" as const },
    { key: "deliveries", label: "Pending deliveries", value: 14, sublabel: "6 this week", variant: "warning" as const, href: "/dashboard/new-car/deliveries" },
    { key: "leads", label: "Active leads", value: leads.length, sublabel: `${hotLeadsCount} hot`, href: "/dashboard/new-car/leads" },
    { key: "finance", label: "Finance conversion", value: "68%", sublabel: "32 files MTD", trend: 5.2, variant: "success" as const },
    { key: "insurance", label: "Insurance conversion", value: "74%", sublabel: "ACKO + Digit", trend: 3.1, variant: "success" as const },
    { key: "testdrives", label: "Test drives", value: 0, sublabel: "No bookings in demo snapshot", href: "/dashboard/new-car/test-drives" },
    { key: "whatsapp", label: "WhatsApp enquiries", value: 156, sublabel: "24 unread", href: "/dashboard/new-car/whatsapp" },
    { key: "booking", label: "Booking amount", value: "₹42.5L", sublabel: "Token collected MTD" },
    { key: "accessories", label: "Accessories revenue", value: "₹8.4L", sublabel: "+18% attach rate" },
    { key: "exchange", label: "Exchange requests", value: 9, sublabel: "3 valuations pending", href: "/dashboard/new-car/exchange" },
    { key: "ticket", label: "Avg ticket size", value: "₹21.6L", sublabel: "On-road average", trend: 2.3, variant: "premium" as const },
  ];

  return {
    showroom,
    metrics,
    hotLeadsCount,
    inventory,
    leads,
    bookings: [
      { id: "bk-1", customerName: "Karan Shah", vehicleLabel: "Creta SX(O)", tokenAmount: 50000, bookingAmount: 2185000, status: "finance_processing", bookedAt: "2026-05-10" },
      { id: "bk-2", customerName: "Meera Nair", vehicleLabel: "Verna SX Turbo", tokenAmount: 25000, bookingAmount: 1912000, status: "vehicle_allocated", bookedAt: "2026-05-08" },
    ],
    deliveries: [
      { id: "del-1", customerName: "Amit Rao", vehicleLabel: "Venue SX(O)", pdiComplete: true, rcStatus: "HSRP pending", deliveryDate: "2026-05-22" },
      { id: "del-2", customerName: "Pooja Kale", vehicleLabel: "Exter SX", pdiComplete: false, rcStatus: "RTO submitted" },
    ],
    staff: [
      { id: "st-1", fullName: "Priya Sharma", role: "Sales executive", monthlyTarget: 12, carsSoldMtd: 9, leadsAssigned: 28 },
      { id: "st-2", fullName: "Vikram Patil", role: "Sales executive", monthlyTarget: 12, carsSoldMtd: 7, leadsAssigned: 22 },
      { id: "st-3", fullName: "Rohan Deshmukh", role: "Finance executive", monthlyTarget: 0, carsSoldMtd: 0, leadsAssigned: 0 },
    ],
    insights: [
      { id: "ai-1", title: "Creta demand rising in Pune", summary: "Walk-ins up 18% — consider ₹40k festive bundle on SX(O).", severity: "success", actionLabel: "View stock", actionUrl: "/dashboard/new-car/inventory" },
      { id: "ai-2", title: "Insurance renewals due", summary: "14 customer policies expiring this week — WhatsApp nudge ready.", severity: "warning", actionLabel: "Open insurance", actionUrl: "/dashboard/new-car/insurance" },
      { id: "ai-3", title: "High-intent lead", summary: "Suresh Kulkarni (Alcazar) — 92 score, finance stage.", severity: "info", actionLabel: "Open lead", actionUrl: "/dashboard/new-car/leads/lead-3" },
    ],
    salesChart: [
      { month: "Jan", units: 38, revenue: 8.2 },
      { month: "Feb", units: 42, revenue: 9.1 },
      { month: "Mar", units: 48, revenue: 10.4 },
      { month: "Apr", units: 45, revenue: 9.8 },
      { month: "May", units: 52, revenue: 11.2 },
    ],
    leadSourceChart: [
      { source: "WhatsApp", count: 42 },
      { source: "Walk-in", count: 38 },
      { source: "Meta", count: 28 },
      { source: "Google", count: 22 },
      { source: "CarDekho", count: 18 },
    ],
  };
}

export function getLeadDetail(leadId: string): import("../types").NcdLeadDetail | null {
  const snap = buildMockNewCarDealerSnapshot();
  const lead = snap.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  return {
    ...lead,
    followups: [
      { id: "f1", note: "Shared Creta brochure & on-road quote", channel: "WhatsApp", at: new Date(Date.now() - 7200000).toISOString() },
      { id: "f2", note: "Test drive booked Saturday 11 AM", channel: "call", at: new Date(Date.now() - 86400000).toISOString() },
    ],
    whatsappCount: 14,
  };
}

export { STAGES as NCD_LEAD_STAGES };

export function greetingForDealer(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0] ?? name} 👋`;
}

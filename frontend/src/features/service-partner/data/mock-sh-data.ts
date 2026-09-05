import type { ServicePartnerSnapshot, ShJobCard, ShWorkflowStage } from "../types";

export function greetingForWorkshop(name: string): string {
  const h = new Date().getHours();
  const slot = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const first = name.split(/\s+/)[0] || "Partner";
  return `Good ${slot} ${first} 👋`;
}

const DEMO_JOBS: ShJobCard[] = [
  {
    id: "jc-1",
    jobNo: "JOB-2405-881",
    customerName: "Rahul Mehta",
    customerPhone: "9876543210",
    vehicle: "Hyundai Creta 2022 Diesel",
    vin: "MALBM51BLNM123456",
    complaints: "Brake noise, periodic service due",
    technician: "Ravi Kumar",
    labourAmount: 3500,
    estimatedTotal: 12400,
    stage: "in_repair",
    deliveryAt: "2026-05-21T18:00:00",
  },
  {
    id: "jc-2",
    jobNo: "JOB-2405-882",
    customerName: "Priya Sharma",
    vehicle: "Kia Seltos GTX Petrol",
    complaints: "AC not cooling, inspection required",
    technician: "Amit Singh",
    labourAmount: 2200,
    estimatedTotal: 8900,
    stage: "approval_pending",
  },
  {
    id: "jc-3",
    jobNo: "JOB-2405-883",
    customerName: "Delhi Fleet Co.",
    vehicle: "Maruti Ertiga 2020",
    complaints: "Denting — front bumper",
    labourAmount: 8000,
    estimatedTotal: 42000,
    stage: "inspection",
  },
  {
    id: "jc-4",
    jobNo: "JOB-2405-884",
    customerName: "Vikram Joshi",
    vehicle: "Tata Nexon EV",
    complaints: "Battery health check, software update",
    technician: "Ravi Kumar",
    labourAmount: 1500,
    estimatedTotal: 6500,
    stage: "washing",
  },
  {
    id: "jc-5",
    jobNo: "JOB-2405-885",
    customerName: "Anita Verma",
    vehicle: "Honda City VX",
    complaints: "Ceramic coating package",
    labourAmount: 12000,
    estimatedTotal: 28500,
    stage: "ready_delivery",
  },
];

function kanbanFromJobs(jobs: ShJobCard[]) {
  const cols: { stage: ShWorkflowStage; label: string }[] = [
    { stage: "waiting", label: "Waiting" },
    { stage: "inspection", label: "Inspection" },
    { stage: "approval_pending", label: "Approval" },
    { stage: "in_repair", label: "In repair" },
    { stage: "washing", label: "Washing" },
    { stage: "ready_delivery", label: "Ready" },
    { stage: "delivered", label: "Delivered" },
  ];
  return cols.map((c) => ({
    ...c,
    jobs: jobs.filter((j) => j.stage === c.stage),
  }));
}

export function emptyServicePartnerSnapshot(
  centerName = "Your workshop",
  city = "India"
): ServicePartnerSnapshot {
  return {
    centerId: null,
    profile: {
      id: "",
      name: centerName,
      city,
      rating: 0,
      isVerified: false,
      activeJobs: 0,
      techniciansOnline: 0,
      satisfactionPct: 0,
      branchCount: 0,
    },
    activeVehicles: 0,
    revenueToday: 0,
    revenueMonth: 0,
    metrics: [
      { key: "rev_today", label: "Revenue today", value: "₹0", href: "/dashboard/service/finance/revenue" },
      { key: "active", label: "Active jobs", value: 0, href: "/dashboard/service/workshop/kanban" },
      { key: "completed", label: "Completed jobs", value: 0, href: "/dashboard/service/bookings/completed" },
    ],
    insights: [],
    bookings: [],
    jobCards: [],
    kanban: kanbanFromJobs([]),
    technicians: [],
    customers: [],
  };
}

export function buildMockServicePartnerSnapshot(
  centerName = "Motorcart Premium Garage",
  city = "Delhi NCR",
  activeJobs = 18
): ServicePartnerSnapshot {
  const jobs = DEMO_JOBS;
  return {
    centerId: "demo-center",
    profile: {
      id: "demo-center",
      name: centerName,
      city,
      rating: 4.8,
      isVerified: true,
      activeJobs,
      techniciansOnline: 6,
      satisfactionPct: 94,
      branchCount: 2,
    },
    activeVehicles: activeJobs,
    revenueToday: 84200,
    revenueMonth: 1240000,
    metrics: [
      { key: "rev_today", label: "Revenue today", value: "₹84.2K", variant: "premium", trend: 8, sparkline: [42, 55, 48, 62, 70, 78, 84], href: "/dashboard/service/finance/revenue" },
      { key: "rev_month", label: "Monthly revenue", value: "₹12.4L", sublabel: "Target ₹18L", trend: 12, sparkline: [8, 9, 9.5, 10, 11, 12, 12.4], href: "/dashboard/service/analytics/revenue" },
      { key: "active", label: "Active jobs", value: activeJobs, variant: "warning", href: "/dashboard/service/workshop/kanban" },
      { key: "completed", label: "Completed jobs", value: 42, sublabel: "This week", trend: 6, href: "/dashboard/service/bookings/completed" },
      { key: "tech", label: "Technicians active", value: 6, sublabel: "2 on pickup", href: "/dashboard/service/workshop/technicians" },
      { key: "pickup", label: "Pickup requests", value: 5, href: "/dashboard/service/operations/pickup" },
      { key: "repeat", label: "Repeat customers", value: 312, trend: 9, href: "/dashboard/service/customers/repeat" },
      { key: "avg_bill", label: "Average billing", value: "₹8,420", href: "/dashboard/service/analytics/revenue" },
      { key: "rating", label: "Customer rating", value: "4.8★", variant: "success", href: "/dashboard/service/customers/reviews" },
      { key: "pending", label: "Pending approvals", value: 3, variant: "warning", href: "/dashboard/service/workshop/inspection" },
    ],
    insights: [
      { id: "ai-1", title: "Battery demand increasing", summary: "Exide 65Ah — 4 bookings this week in Noida.", severity: "success", actionUrl: "/dashboard/service/parts/inventory" },
      { id: "ai-2", title: "3 jobs delayed", summary: "Bay 2 & 4 over SLA — reassign technician.", severity: "warning", actionUrl: "/dashboard/service/workshop/kanban" },
      { id: "ai-3", title: "Brake pad stock low", summary: "Bosch kit below MOQ — order from supplier.", severity: "warning", actionUrl: "/dashboard/service/parts/low-stock" },
      { id: "ai-4", title: "SUV servicing up 24%", summary: "Creta & Seltos dominate periodic service.", severity: "success", actionUrl: "/dashboard/service/analytics/services" },
      { id: "ai-5", title: "Technician Ravi — highest productivity", summary: "12 jobs completed MTD · 98% CSAT.", severity: "info", actionUrl: "/dashboard/service/analytics/technicians" },
    ],
    bookings: [],
    jobCards: jobs,
    kanban: kanbanFromJobs(jobs),
    technicians: [
      { id: "t1", name: "Ravi Kumar", role: "technician", active: true, jobsToday: 4, skill: "Engine & EV" },
      { id: "t2", name: "Amit Singh", role: "technician", active: true, jobsToday: 3, skill: "AC & electrical" },
      { id: "t3", name: "Suresh Patel", role: "service advisor", active: true, jobsToday: 8, skill: "Estimates" },
      { id: "t4", name: "Neha Gupta", role: "pickup driver", active: true, jobsToday: 5, skill: "Logistics" },
    ],
    customers: [
      { id: "c1", name: "Rahul Mehta", phone: "9876543210", vehicles: 2, visits: 8, loyaltyPoints: 420, lastVisit: "2026-05-18" },
      { id: "c2", name: "Priya Sharma", phone: "9988776655", vehicles: 1, visits: 4, loyaltyPoints: 180, lastVisit: "2026-05-19" },
      { id: "c3", name: "Delhi Fleet Co.", phone: "9111222333", vehicles: 12, visits: 24, loyaltyPoints: 2400, lastVisit: "2026-05-20" },
    ],
  };
}

export function getMockJobCard(id: string): ShJobCard | null {
  return DEMO_JOBS.find((j) => j.id === id) ?? null;
}

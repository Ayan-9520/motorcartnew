import { prisma } from "@/lib/prisma";
import { hasOrganizationPermission } from "@/lib/organization/permissions";
import { TestDriveError } from "@/lib/test-drives/errors";
import {
  ADMIN_ROLES,
  DEALER_TEST_DRIVE_ROLES,
  type TestDriveActor,
} from "@/lib/test-drives/http";
import {
  assertTransition,
  DUPLICATE_WINDOW_MS,
  optionalDateTime,
  resolveRange,
  stripClientOwnedFields,
  TERMINAL_STATUSES,
} from "@/lib/test-drives/lifecycle";
import {
  emptySnapshot,
  serializeTestDrive,
  type TestDriveSnapshot,
} from "@/lib/test-drives/serialize";
import type { Prisma, TestDriveBooking, TestDriveStatus } from "@prisma/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DealerScope = { dealerIds: string[]; admin: boolean };

async function dealerScope(actor: TestDriveActor): Promise<DealerScope> {
  if (ADMIN_ROLES.has(actor.role)) return { dealerIds: [], admin: true };

  const [owned, members, orgMembers] = await Promise.all([
    prisma.dealer.findMany({
      where: { ownerId: actor.userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.dealerMember.findMany({
      where: { userId: actor.userId },
      select: { dealerId: true },
    }),
    prisma.organizationMember.findMany({
      where: { userId: actor.userId, status: "active" },
      include: { organization: { select: { legacyDealerId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const d of owned) ids.add(d.id);
  for (const m of members) ids.add(m.dealerId);
  for (const m of orgMembers) {
    if (m.organization.legacyDealerId) ids.add(m.organization.legacyDealerId);
  }
  return { dealerIds: [...ids], admin: false };
}

async function canWriteTestDrives(actor: TestDriveActor, dealerId: string): Promise<boolean> {
  if (ADMIN_ROLES.has(actor.role)) return true;
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!dealer) return false;
  if (dealer.ownerId === actor.userId) return true;
  const member = await prisma.dealerMember.findFirst({
    where: { dealerId, userId: actor.userId },
  });
  if (member) return true;
  const org = await prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
    include: {
      members: { where: { userId: actor.userId, status: "active" } },
    },
  });
  const orgMember = org?.members[0];
  if (!orgMember) return false;
  return hasOrganizationPermission(
    orgMember.role,
    "booking.create",
    Array.isArray(orgMember.permissions) ? (orgMember.permissions as string[]) : [],
  );
}

function requireDealerRole(actor: TestDriveActor) {
  if (ADMIN_ROLES.has(actor.role) || DEALER_TEST_DRIVE_ROLES.has(actor.role)) return;
  throw new TestDriveError("Only dealers can manage test-drive requests", 403, "FORBIDDEN");
}

function optionalId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  return s ? s : null;
}

function requireUuid(id: string, code: string, message: string) {
  if (!UUID_RE.test(id)) throw new TestDriveError(message, 400, code);
}

async function organizationIdForDealer(dealerId: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { legacyDealerId: dealerId, deletedAt: null },
    select: { id: true },
  });
  return org?.id ?? null;
}

async function assertCanRead(actor: TestDriveActor, row: TestDriveBooking) {
  if (ADMIN_ROLES.has(actor.role)) return;
  if (row.customerUserId === actor.userId) return;
  if (!DEALER_TEST_DRIVE_ROLES.has(actor.role)) {
    throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  }
  const scope = await dealerScope(actor);
  if (!scope.admin && !scope.dealerIds.includes(row.dealerId)) {
    throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  }
}

async function loadOwned(actor: TestDriveActor, id: string): Promise<TestDriveBooking> {
  if (!UUID_RE.test(id)) throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  const row = await prisma.testDriveBooking.findFirst({ where: { id } });
  if (!row) throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  await assertCanRead(actor, row);
  return row;
}

async function notify(userId: string, title: string, body: string, payload: Record<string, unknown>) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        message: body,
        kind: "test_drive",
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* in-app notification must not block the booking */
  }
}

async function notifyDealerOwner(dealerId: string, title: string, body: string, payload: Record<string, unknown>) {
  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId },
    select: { ownerId: true },
  });
  if (dealer?.ownerId) {
    await notify(dealer.ownerId, title, body, payload);
  }
}

async function buildSnapshot(input: {
  customerUserId: string;
  dealerId: string;
  organizationId: string | null;
  branchId: string | null;
  vehicleId: string | null;
  inventoryId: string | null;
  quotationId: string | null;
  leadId: string | null;
}): Promise<TestDriveSnapshot> {
  const [customer, dealer, organization, branch, lead, vehicle, inventory, quotation] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.customerUserId },
      select: { id: true, fullName: true, phone: true, email: true },
    }),
    prisma.dealer.findFirst({
      where: { id: input.dealerId },
      select: { id: true, name: true, slug: true, city: true, state: true, phone: true },
    }),
    input.organizationId
      ? prisma.organization.findFirst({
          where: { id: input.organizationId },
          select: { id: true, name: true, displayName: true, slug: true },
        })
      : null,
    input.branchId
      ? prisma.organizationBranch.findFirst({
          where: { id: input.branchId },
          select: { id: true, name: true, city: true, postalCode: true },
        })
      : null,
    input.leadId
      ? prisma.lead.findFirst({
          where: { id: input.leadId },
          select: { id: true, name: true, phone: true, vehicleInterest: true },
        })
      : null,
    input.vehicleId
      ? prisma.vehicle.findFirst({
          where: { id: input.vehicleId },
          select: { id: true, title: true, brand: true, model: true, variant: true, year: true, slug: true },
        })
      : null,
    input.inventoryId
      ? prisma.newCarInventory.findFirst({
          where: { id: input.inventoryId },
          select: {
            id: true,
            brand: true,
            model: true,
            variant: true,
            year: true,
            fuelType: true,
            transmission: true,
            stockStatus: true,
          },
        })
      : null,
    input.quotationId
      ? prisma.quotation.findFirst({
          where: { id: input.quotationId },
          select: { id: true, quotationNumber: true, status: true },
        })
      : null,
  ]);

  const snap = emptySnapshot();
  snap.customer = customer;
  snap.dealer = dealer;
  snap.organization = organization;
  snap.branch = branch;
  snap.lead = lead;
  snap.vehicle = vehicle;
  snap.inventory = inventory;
  snap.quotation = quotation;
  return snap;
}

async function resolveSubjectDealer(body: Record<string, unknown>): Promise<{
  dealerId: string;
  vehicleId: string | null;
  inventoryId: string | null;
}> {
  let vehicleId = optionalId(body.vehicleId ?? body.vehicle_id);
  let inventoryId = optionalId(body.inventoryId ?? body.inventory_id);
  if (!vehicleId && !inventoryId) {
    throw new TestDriveError("vehicleId or inventoryId is required", 400, "SUBJECT_REQUIRED");
  }
  if (vehicleId) requireUuid(vehicleId, "INVALID_VEHICLE", "Invalid vehicle");
  if (inventoryId) requireUuid(inventoryId, "INVALID_INVENTORY", "Invalid inventory");

  let dealerFromVehicle: string | null = null;
  let dealerFromInventory: string | null = null;
  let linkedVehicleFromInventory: string | null = null;

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
      select: { id: true, dealerId: true },
    });
    if (!vehicle) {
      // New-car UI often sends inventory UUID as vehicleId — remap when it matches stock
      const asInventory = await prisma.newCarInventory.findFirst({
        where: { id: vehicleId },
        select: { id: true, dealerId: true, metadata: true },
      });
      if (!asInventory) throw new TestDriveError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
      inventoryId = asInventory.id;
      dealerFromInventory = asInventory.dealerId;
      const meta =
        asInventory.metadata && typeof asInventory.metadata === "object" && !Array.isArray(asInventory.metadata)
          ? (asInventory.metadata as Record<string, unknown>)
          : {};
      const linked = optionalId(meta.vehicle_id ?? meta.vehicleId);
      vehicleId = linked;
      if (linked) {
        const linkedVehicle = await prisma.vehicle.findFirst({
          where: { id: linked, deletedAt: null },
          select: { id: true, dealerId: true },
        });
        if (linkedVehicle?.dealerId) dealerFromVehicle = linkedVehicle.dealerId;
        linkedVehicleFromInventory = linkedVehicle?.id ?? null;
        vehicleId = linkedVehicleFromInventory;
      }
    } else {
      if (!vehicle.dealerId) {
        throw new TestDriveError("This listing has no dealer for a test drive", 400, "VEHICLE_NO_DEALER");
      }
      dealerFromVehicle = vehicle.dealerId;
    }
  }

  if (inventoryId) {
    const inventory = await prisma.newCarInventory.findFirst({
      where: { id: inventoryId },
      select: { id: true, dealerId: true, metadata: true },
    });
    if (!inventory) throw new TestDriveError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    dealerFromInventory = inventory.dealerId;
    if (!vehicleId) {
      const meta =
        inventory.metadata && typeof inventory.metadata === "object" && !Array.isArray(inventory.metadata)
          ? (inventory.metadata as Record<string, unknown>)
          : {};
      const linked = optionalId(meta.vehicle_id ?? meta.vehicleId);
      if (linked) {
        const linkedVehicle = await prisma.vehicle.findFirst({
          where: { id: linked, deletedAt: null },
          select: { id: true, dealerId: true },
        });
        if (linkedVehicle) {
          vehicleId = linkedVehicle.id;
          if (linkedVehicle.dealerId) dealerFromVehicle = linkedVehicle.dealerId;
        }
      }
    }
  }

  if (dealerFromVehicle && dealerFromInventory && dealerFromVehicle !== dealerFromInventory) {
    throw new TestDriveError("Inventory does not belong to this vehicle's dealer", 403, "INVENTORY_FORBIDDEN");
  }

  const dealerId = dealerFromInventory ?? dealerFromVehicle;
  if (!dealerId) throw new TestDriveError("Unable to resolve dealer", 400, "DEALER_REQUIRED");

  const claimedDealer = optionalId(body.dealerId ?? body.dealer_id);
  if (claimedDealer && claimedDealer !== dealerId) {
    throw new TestDriveError("dealerId is not accepted from the client", 400, "FORGED_DEALER_ID");
  }

  return { dealerId, vehicleId, inventoryId };
}

async function assertLeadForDealer(dealerId: string, leadId: string | null) {
  if (!leadId) return;
  requireUuid(leadId, "INVALID_LEAD", "Invalid lead");
  const row = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!row) throw new TestDriveError("Lead not found", 404, "LEAD_NOT_FOUND");
  if (row.dealerId !== dealerId) {
    throw new TestDriveError("Lead does not belong to this dealer", 403, "LEAD_FORBIDDEN");
  }
}

async function assertQuotationLink(customerUserId: string, dealerId: string, quotationId: string | null) {
  if (!quotationId) return;
  requireUuid(quotationId, "INVALID_QUOTATION", "Invalid quotation");
  const row = await prisma.quotation.findFirst({ where: { id: quotationId } });
  if (!row) throw new TestDriveError("Quotation not found", 404, "QUOTATION_NOT_FOUND");
  if (row.dealerId !== dealerId || row.customerUserId !== customerUserId) {
    throw new TestDriveError("Quotation does not match this test drive", 403, "QUOTATION_FORBIDDEN");
  }
}

async function assertBranchForOrg(organizationId: string | null, branchId: string | null) {
  if (!branchId) return;
  requireUuid(branchId, "INVALID_BRANCH", "Invalid branch");
  const branch = await prisma.organizationBranch.findFirst({ where: { id: branchId } });
  if (!branch) throw new TestDriveError("Branch not found", 404, "BRANCH_NOT_FOUND");
  if (!organizationId || branch.organizationId !== organizationId) {
    throw new TestDriveError("Branch does not belong to this dealer", 403, "BRANCH_FORBIDDEN");
  }
}

async function assertNoDuplicate(input: {
  customerUserId: string;
  dealerId: string;
  vehicleId: string | null;
  inventoryId: string | null;
  start: Date;
}) {
  const windowStart = new Date(input.start.getTime() - DUPLICATE_WINDOW_MS);
  const windowEnd = new Date(input.start.getTime() + DUPLICATE_WINDOW_MS);
  const existing = await prisma.testDriveBooking.findFirst({
    where: {
      customerUserId: input.customerUserId,
      dealerId: input.dealerId,
      vehicleId: input.vehicleId,
      inventoryId: input.inventoryId,
      status: { in: ["requested", "confirmed", "rescheduled"] },
      requestedStartAt: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true },
  });
  if (existing) {
    throw new TestDriveError(
      "A test-drive request for this vehicle and time already exists",
      409,
      "DUPLICATE_REQUEST",
    );
  }
}

export async function listTestDrives(actor: TestDriveActor) {
  if (DEALER_TEST_DRIVE_ROLES.has(actor.role) || ADMIN_ROLES.has(actor.role)) {
    const scope = await dealerScope(actor);
    if (!scope.admin && !scope.dealerIds.length) return [];
    const where: Prisma.TestDriveBookingWhereInput = scope.admin
      ? {}
      : { dealerId: { in: scope.dealerIds } };
    const rows = await prisma.testDriveBooking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => serializeTestDrive(row));
  }

  const rows = await prisma.testDriveBooking.findMany({
    where: { customerUserId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => serializeTestDrive(row));
}

export async function getTestDrive(actor: TestDriveActor, id: string) {
  const row = await loadOwned(actor, id);
  return serializeTestDrive(row);
}

export async function createTestDrive(actor: TestDriveActor, body: Record<string, unknown>) {
  const claimedCustomer = optionalId(body.customerUserId ?? body.customer_user_id);
  if (claimedCustomer) {
    if (!UUID_RE.test(claimedCustomer)) {
      throw new TestDriveError("Invalid customerUserId", 400, "FORGED_CUSTOMER_ID");
    }
    if (claimedCustomer !== actor.userId) {
      throw new TestDriveError("customerUserId is not accepted from the client", 400, "FORGED_CUSTOMER_ID");
    }
  }

  const { dealerId, vehicleId, inventoryId } = await resolveSubjectDealer(body);
  const organizationId = await organizationIdForDealer(dealerId);
  const claimedOrg = optionalId(body.organizationId ?? body.organization_id);
  if (claimedOrg && claimedOrg !== organizationId) {
    throw new TestDriveError("organizationId is not accepted from the client", 400, "FORGED_ORGANIZATION_ID");
  }

  const leadId = optionalId(body.leadId ?? body.lead_id);
  const quotationId = optionalId(body.quotationId ?? body.quotation_id);
  const branchId = optionalId(body.branchId ?? body.branch_id);

  await Promise.all([
    assertLeadForDealer(dealerId, leadId),
    assertQuotationLink(actor.userId, dealerId, quotationId),
    assertBranchForOrg(organizationId, branchId),
  ]);

  const { start, end } = resolveRange(
    body.requestedStartAt ?? body.requested_start_at,
    body.requestedEndAt ?? body.requested_end_at,
  );

  await assertNoDuplicate({
    customerUserId: actor.userId,
    dealerId,
    vehicleId,
    inventoryId,
    start,
  });

  const snapshot = await buildSnapshot({
    customerUserId: actor.userId,
    dealerId,
    organizationId,
    branchId,
    vehicleId,
    inventoryId,
    quotationId,
    leadId,
  });

  const row = await prisma.testDriveBooking.create({
    data: {
      status: "requested",
      customerUserId: actor.userId,
      dealerId,
      organizationId,
      branchId,
      vehicleId,
      inventoryId,
      quotationId,
      leadId,
      requestedStartAt: start,
      requestedEndAt: end,
      customerNotes: body.customerNotes != null || body.customer_notes != null
        ? String(body.customerNotes ?? body.customer_notes).slice(0, 4000)
        : null,
      metadata: snapshot as unknown as Prisma.InputJsonValue,
      createdByUserId: actor.userId,
    },
  });

  const label =
    (snapshot.vehicle as { title?: string } | null)?.title ||
    [snapshot.inventory?.brand, snapshot.inventory?.model].filter(Boolean).join(" ") ||
    "a vehicle";

  await notify(actor.userId, "Test-drive request submitted", `Your request for ${label} has been submitted. The dealer will confirm a time.`, {
    testDriveId: row.id,
    status: row.status,
  });
  await notifyDealerOwner(
    dealerId,
    "New test-drive request",
    `${snapshot.customer && typeof snapshot.customer === "object" && "fullName" in snapshot.customer ? String(snapshot.customer.fullName ?? "A customer") : "A customer"} requested a test drive for ${label}`,
    { testDriveId: row.id, dealerId, status: row.status },
  );

  return serializeTestDrive(row);
}

export async function updateTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown>) {
  const existing = await loadOwned(actor, id);
  const cleaned = stripClientOwnedFields(body);

  if (DEALER_TEST_DRIVE_ROLES.has(actor.role) || ADMIN_ROLES.has(actor.role)) {
    requireDealerRole(actor);
    if (!(await canWriteTestDrives(actor, existing.dealerId))) {
      throw new TestDriveError("Not authorized to update this test drive", 403, "FORBIDDEN");
    }
    const row = await prisma.testDriveBooking.update({
      where: { id: existing.id },
      data: {
        dealerNotes:
          cleaned.dealerNotes != null || cleaned.dealer_notes != null
            ? String(cleaned.dealerNotes ?? cleaned.dealer_notes).slice(0, 4000)
            : existing.dealerNotes,
      },
    });
    return serializeTestDrive(row);
  }

  if (existing.customerUserId !== actor.userId) {
    throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  }
  if (TERMINAL_STATUSES.has(existing.status) || existing.status === "confirmed") {
    throw new TestDriveError("Notes can only be updated before confirmation", 409, "NOT_EDITABLE");
  }
  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      customerNotes:
        cleaned.customerNotes != null || cleaned.customer_notes != null
          ? String(cleaned.customerNotes ?? cleaned.customer_notes).slice(0, 4000)
          : existing.customerNotes,
    },
  });
  return serializeTestDrive(row);
}

async function dealerAction(actor: TestDriveActor, id: string) {
  requireDealerRole(actor);
  const existing = await loadOwned(actor, id);
  if (!(await canWriteTestDrives(actor, existing.dealerId))) {
    throw new TestDriveError("Not authorized for this test drive", 403, "FORBIDDEN");
  }
  return existing;
}

export async function confirmTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown> = {}) {
  const existing = await dealerAction(actor, id);
  assertTransition(existing.status, "confirmed");

  const start =
    optionalDateTime(body.confirmedStartAt ?? body.confirmed_start_at, "confirmedStartAt") ??
    existing.requestedStartAt;
  const end =
    optionalDateTime(body.confirmedEndAt ?? body.confirmed_end_at, "confirmedEndAt") ??
    existing.requestedEndAt;
  resolveRange(start.toISOString(), end.toISOString());

  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      status: "confirmed",
      confirmedStartAt: start,
      confirmedEndAt: end,
      dealerNotes:
        body.dealerNotes != null || body.dealer_notes != null
          ? String(body.dealerNotes ?? body.dealer_notes).slice(0, 4000)
          : existing.dealerNotes,
    },
  });

  await notify(row.customerUserId, "Test drive confirmed", "The dealer confirmed your test-drive time.", {
    testDriveId: row.id,
    status: row.status,
  });
  return serializeTestDrive(row);
}

export async function rescheduleTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown>) {
  const existing = await dealerAction(actor, id);
  assertTransition(existing.status, "rescheduled");

  const { start, end } = resolveRange(
    body.confirmedStartAt ?? body.confirmed_start_at ?? body.requestedStartAt ?? body.requested_start_at,
    body.confirmedEndAt ?? body.confirmed_end_at ?? body.requestedEndAt ?? body.requested_end_at,
  );

  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      status: "rescheduled",
      requestedStartAt: start,
      requestedEndAt: end,
      confirmedStartAt: start,
      confirmedEndAt: end,
      dealerNotes:
        body.dealerNotes != null || body.dealer_notes != null
          ? String(body.dealerNotes ?? body.dealer_notes).slice(0, 4000)
          : existing.dealerNotes,
    },
  });

  await notify(row.customerUserId, "Test drive rescheduled", "The dealer proposed a new test-drive time.", {
    testDriveId: row.id,
    status: row.status,
  });
  return serializeTestDrive(row);
}

export async function rejectTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown> = {}) {
  const existing = await dealerAction(actor, id);
  assertTransition(existing.status, "rejected");
  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      status: "rejected",
      rejectionReason:
        body.rejectionReason != null || body.rejection_reason != null
          ? String(body.rejectionReason ?? body.rejection_reason).slice(0, 2000)
          : existing.rejectionReason,
      dealerNotes:
        body.dealerNotes != null || body.dealer_notes != null
          ? String(body.dealerNotes ?? body.dealer_notes).slice(0, 4000)
          : existing.dealerNotes,
    },
  });
  await notify(row.customerUserId, "Test-drive request declined", "The dealer declined this test-drive request.", {
    testDriveId: row.id,
    status: row.status,
  });
  return serializeTestDrive(row);
}

export async function completeTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown> = {}) {
  const existing = await dealerAction(actor, id);
  assertTransition(existing.status, "completed");
  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      dealerNotes:
        body.dealerNotes != null || body.dealer_notes != null
          ? String(body.dealerNotes ?? body.dealer_notes).slice(0, 4000)
          : existing.dealerNotes,
    },
  });
  await notify(row.customerUserId, "Test drive completed", "Your test drive was marked completed.", {
    testDriveId: row.id,
    status: row.status,
  });
  return serializeTestDrive(row);
}

export async function markNoShow(actor: TestDriveActor, id: string, body: Record<string, unknown> = {}) {
  const existing = await dealerAction(actor, id);
  assertTransition(existing.status, "no_show");
  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: {
      status: "no_show",
      dealerNotes:
        body.dealerNotes != null || body.dealer_notes != null
          ? String(body.dealerNotes ?? body.dealer_notes).slice(0, 4000)
          : existing.dealerNotes,
    },
  });
  await notify(row.customerUserId, "Test-drive no-show", "The dealer marked this appointment as a no-show.", {
    testDriveId: row.id,
    status: row.status,
  });
  return serializeTestDrive(row);
}

export async function cancelTestDrive(actor: TestDriveActor, id: string, body: Record<string, unknown> = {}) {
  const existing = await loadOwned(actor, id);
  assertTransition(existing.status, "cancelled");

  const isOwnerCustomer = existing.customerUserId === actor.userId;
  const canDealer =
    (DEALER_TEST_DRIVE_ROLES.has(actor.role) || ADMIN_ROLES.has(actor.role)) &&
    (await canWriteTestDrives(actor, existing.dealerId));

  if (!isOwnerCustomer && !canDealer) {
    throw new TestDriveError("Test drive not found", 404, "NOT_FOUND");
  }

  const reason =
    body.cancellationReason != null || body.cancellation_reason != null
      ? String(body.cancellationReason ?? body.cancellation_reason).slice(0, 2000)
      : existing.cancellationReason;

  const row = await prisma.testDriveBooking.update({
    where: { id: existing.id },
    data: { status: "cancelled", cancellationReason: reason },
  });

  if (isOwnerCustomer && !canDealer) {
    await notifyDealerOwner(row.dealerId, "Test drive cancelled", "A customer cancelled a test-drive request.", {
      testDriveId: row.id,
      status: row.status,
    });
  } else {
    await notify(row.customerUserId, "Test drive cancelled", "The dealer cancelled this test-drive appointment.", {
      testDriveId: row.id,
      status: row.status,
    });
  }
  return serializeTestDrive(row);
}

export { stripClientOwnedFields };
export type { TestDriveStatus };

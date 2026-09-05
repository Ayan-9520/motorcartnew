import type { TestDriveStatus } from "@prisma/client";
import { TestDriveError } from "./errors";

export const TERMINAL_STATUSES: ReadonlySet<TestDriveStatus> = new Set([
  "completed",
  "cancelled",
  "rejected",
  "no_show",
]);

const ALLOWED: Record<TestDriveStatus, readonly TestDriveStatus[]> = {
  requested: ["confirmed", "rescheduled", "cancelled", "rejected"],
  rescheduled: ["confirmed", "rescheduled", "cancelled", "rejected"],
  confirmed: ["rescheduled", "completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

export const DEFAULT_DURATION_MS = 60 * 60 * 1000;
export const MAX_DURATION_MS = 8 * 60 * 60 * 1000;
export const MAX_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;
export const CLOCK_SKEW_MS = 2 * 60 * 1000;
export const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

export function canTransition(from: TestDriveStatus, to: TestDriveStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: TestDriveStatus, to: TestDriveStatus) {
  if (!canTransition(from, to)) {
    throw new TestDriveError(
      `Cannot change a ${from} test drive to ${to}`,
      409,
      "INVALID_TRANSITION",
    );
  }
}

export function parseDateTime(value: unknown, field: string): Date {
  if (value == null || value === "") {
    throw new TestDriveError(`${field} is required`, 400, "INVALID_TIME");
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new TestDriveError(`Invalid ${field}`, 400, "INVALID_TIME");
  }
  return d;
}

export function optionalDateTime(value: unknown, field: string): Date | null {
  if (value == null || value === "") return null;
  return parseDateTime(value, field);
}

export function resolveRange(
  startRaw: unknown,
  endRaw: unknown,
  options?: { allowPast?: boolean },
): { start: Date; end: Date } {
  const start = parseDateTime(startRaw, "requestedStartAt");
  const end =
    endRaw == null || endRaw === ""
      ? new Date(start.getTime() + DEFAULT_DURATION_MS)
      : parseDateTime(endRaw, "requestedEndAt");
  assertValidRange(start, end, options);
  return { start, end };
}

export function assertValidRange(start: Date, end: Date, options?: { allowPast?: boolean }) {
  if (!(end.getTime() > start.getTime())) {
    throw new TestDriveError("End time must be after start time", 400, "INVALID_TIME_RANGE");
  }
  const duration = end.getTime() - start.getTime();
  if (duration > MAX_DURATION_MS) {
    throw new TestDriveError("Test-drive duration cannot exceed 8 hours", 400, "INVALID_TIME_RANGE");
  }
  const now = Date.now();
  if (!options?.allowPast && start.getTime() < now - CLOCK_SKEW_MS) {
    throw new TestDriveError("Requested time cannot be in the past", 400, "TIME_IN_PAST");
  }
  if (start.getTime() > now + MAX_AHEAD_MS) {
    throw new TestDriveError("Requested time cannot be more than 90 days ahead", 400, "TIME_TOO_FAR");
  }
}

export function stripClientOwnedFields(body: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...body };
  delete cleaned.dealer_id;
  delete cleaned.dealerId;
  delete cleaned.organization_id;
  delete cleaned.organizationId;
  delete cleaned.customer_user_id;
  delete cleaned.customerUserId;
  delete cleaned.status;
  delete cleaned.created_by_user_id;
  delete cleaned.createdByUserId;
  delete cleaned.completed_at;
  delete cleaned.completedAt;
  return cleaned;
}

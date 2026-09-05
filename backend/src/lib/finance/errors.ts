export class FinanceError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
    this.name = "FinanceError";
  }
}

export const FINANCE_DESK_ROLES = new Set([
  "super_admin",
  "admin",
  "finance_manager",
  "bank_nbfc",
]);

export const FINANCE_STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "finance_manager",
]);

export function isFinanceDeskRole(role: string): boolean {
  return FINANCE_DESK_ROLES.has(role);
}

export function isFinanceStaffRole(role: string): boolean {
  return FINANCE_STAFF_ROLES.has(role);
}

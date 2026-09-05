export class InventoryError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "INVENTORY_ERROR") {
    super(message);
    this.name = "InventoryError";
    this.status = status;
    this.code = code;
  }
}

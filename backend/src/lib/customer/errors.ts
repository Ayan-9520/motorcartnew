export class CustomerError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "CUSTOMER_ERROR") {
    super(message);
    this.name = "CustomerError";
    this.status = status;
    this.code = code;
  }
}

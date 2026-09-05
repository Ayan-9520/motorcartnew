export class SalesOsError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "SALES_OS") {
    super(message);
    this.name = "SalesOsError";
    this.status = status;
    this.code = code;
  }
}

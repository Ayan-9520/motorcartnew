export class QuotationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "QUOTATION_ERROR") {
    super(message);
    this.name = "QuotationError";
    this.status = status;
    this.code = code;
  }
}

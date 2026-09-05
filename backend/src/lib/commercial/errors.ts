export class CommercialError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "COMMERCIAL") {
    super(message);
    this.name = "CommercialError";
    this.status = status;
    this.code = code;
  }
}

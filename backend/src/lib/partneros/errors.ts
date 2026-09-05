export class PartnerOsError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "PARTNER_OS") {
    super(message);
    this.name = "PartnerOsError";
    this.status = status;
    this.code = code;
  }
}

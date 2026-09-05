export class CommosError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "COMMOS") {
    super(message);
    this.name = "CommosError";
    this.status = status;
    this.code = code;
  }
}

export class SuperAppError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "SUPERAPP") {
    super(message);
    this.name = "SuperAppError";
    this.status = status;
    this.code = code;
  }
}

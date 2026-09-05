export class CommunityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "COMMUNITY_ERROR") {
    super(message);
    this.name = "CommunityError";
    this.status = status;
    this.code = code;
  }
}

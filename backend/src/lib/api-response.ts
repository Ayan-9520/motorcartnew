import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401);
}

export function forbidden(message = "Forbidden") {
  return err(message, 403);
}

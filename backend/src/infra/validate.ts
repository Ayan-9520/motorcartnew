import type { NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: string; status: number }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.errors.map((e) => e.message).join("; "),
      status: 422,
    };
  }

  return { data: parsed.data };
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

import { NextRequest, NextResponse } from "next/server";
import { err, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadListingImage, RemoteImageError } from "@/lib/brochure/remote-image";

/** Same-origin copy of a listing photo so the poster canvas can be exported (no tainted canvas). */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const url = req.nextUrl.searchParams.get("url") ?? "";
  if (!url || url.length > 2048) return err("url is required");
  try {
    const { buffer, mime } = await loadListingImage(url);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    if (e instanceof RemoteImageError) return err(e.message, e.status);
    console.error("[brochure:image]", e);
    return err("Could not load image", 500);
  }
}

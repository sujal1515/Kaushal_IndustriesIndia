import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Leaves draft preview and returns to the page being viewed (or the home page). */
export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  let target = "/";
  try {
    const back = request.headers.get("referer");
    const u = back ? new URL(back) : null;
    if (u && u.origin === request.nextUrl.origin && !u.pathname.startsWith("/admin")) target = u.pathname + u.search;
  } catch {
    // ignore a malformed referer
  }
  return NextResponse.redirect(new URL(target, request.url));
}

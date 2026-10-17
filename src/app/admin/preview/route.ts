import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { CATALOGUE_ROLES, getStaff } from "@/lib/admin/auth";
import { cmsPages, isPageKey } from "@/lib/cms/pages";

/** Turns on draft preview for content staff and opens the page being edited. */
export async function GET(request: NextRequest) {
  const staff = await getStaff();
  if (!staff || !CATALOGUE_ROLES.includes(staff.role)) return new NextResponse("Forbidden", { status: 403 });
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const path = isPageKey(key) ? (cmsPages[key].path ?? "/") : "/";
  (await draftMode()).enable();
  return NextResponse.redirect(new URL(path, request.url));
}

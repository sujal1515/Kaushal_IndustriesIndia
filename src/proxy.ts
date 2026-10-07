import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { legacyRedirectLookup } from "@/lib/legacy-redirects";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password"];

/**
 * 1. Case-insensitive fallback for legacy *.html URLs (exact-case matches are already
 *    handled by next.config redirects, which run before the proxy).
 * 2. Admin gate: refreshes the Supabase session cookie, requires a signed-in user,
 *    and requires MFA verification (AAL2) for users who have enrolled a factor.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (/\.html?$/i.test(pathname)) {
    const target = legacyRedirectLookup[pathname.toLowerCase().replace(/\.htm$/, ".html")];
    if (target) return NextResponse.redirect(new URL(target, request.url), 308);
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next(); // admin pages render a setup notice

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
  if (!user && !isPublic) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (user && pathname !== "/admin/mfa" && !isPublic) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      return NextResponse.redirect(new URL(`/admin/mfa?next=${encodeURIComponent(pathname)}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/(.*\\.[hH][tT][mM][lL]?)"],
};

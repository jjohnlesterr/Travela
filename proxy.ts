import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/offline"];
/** Auth screens a signed-in user should never see. */
const AUTH_PAGES = ["/login", "/signup"];

const isPublic = (path: string) => PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Next 16 "proxy" (formerly middleware): refreshes the Supabase session cookie and gates the app.
 * No session → /login. Signed in and on /login or /signup → Home.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Validates the JWT and rotates the session cookie when needed. Do not remove.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const res = NextResponse.redirect(url);
    // Carry any refreshed/cleared auth cookies onto the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && !isPublic(path)) return redirectTo("/login");
  if (signedIn && AUTH_PAGES.includes(path)) return redirectTo("/");
  return response;
}

export const config = {
  // Skip static assets, images, the service worker, and API routes (they check auth themselves).
  matcher: ["/((?!_next/static|_next/image|api/|icons/|images/|sw\\.js|manifest\\.webmanifest|icon\\.png|.*\\.(?:png|jpg|jpeg|webp|svg|ico|md)$).*)"],
};

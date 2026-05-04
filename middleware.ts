import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // ⚡ EARLY EXIT FOR STATIC / NON-APP REQUESTS (PERFORMANCE)
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ PUBLIC ROUTES
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // ❌ BLOCK ONLY PROTECTED ROUTES (when logged out)
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔒 PREVENT AUTH PAGES WHEN LOGGED IN
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    return NextResponse.redirect(new URL("/memories", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
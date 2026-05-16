import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const pathname = req.nextUrl.pathname;

    // ✅ PUBLIC API ROUTES
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/send-reminders") ||
    pathname.startsWith("/api/send-notification") ||
    pathname.startsWith("/api/cron")
  ) {
    return res;
  }

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
  const publicRoutes = ["/login", "/signup"];

  const isPublic = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ❌ Not logged in
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ✅ Already logged in
  if (user && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
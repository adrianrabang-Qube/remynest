import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

const MIDDLEWARE_TAG =
  "auth-security-middleware";

const AUTH_ROUTES = [
  "/login",
  "/signup",
];

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/memories",
  "/timeline",
  "/reminders",
  "/insights",
  "/memory-chat",
  "/api",
];

const PUBLIC_API_ROUTES = [
  "/api/stripe/webhook",
  "/api/send-reminders",
  "/api/send-notification",
  "/api/cron",
];

const PUBLIC_STATIC_FILES = [
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/OneSignalSDKWorker.js",
  "/OneSignalSDKUpdaterWorker.js",
  "/apple-touch-icon.png",
  "/browserconfig.xml",
  "/site.webmanifest",
];

function logMiddlewareStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${MIDDLEWARE_TAG}] ${stage}`,
    metadata || {}
  );
}

function logMiddlewareError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${MIDDLEWARE_TAG}] ${stage}`,
    error
  );
}

function createMiddlewareRequestId() {
  return crypto.randomUUID();
}

function isPublicStaticFile(
  pathname: string
) {
  return PUBLIC_STATIC_FILES.some(
    (path) =>
      pathname === path
  );
}

function isBypassRequest(
  pathname: string,
  method: string
) {
  return (
    method === "HEAD" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/fonts/")
  );
}

function isPublicApiRoute(
  pathname: string
) {
  return PUBLIC_API_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`
      )
  );
}

function isPublicRoute(
  pathname: string
) {
  return PUBLIC_ROUTES.some(
    (route) => {
      if (route === "/") {
        return pathname === "/";
      }

      return pathname.startsWith(
        route
      );
    }
  );
}

function isAuthRoute(
  pathname: string
) {
  return AUTH_ROUTES.some(
    (route) =>
      pathname === route
  );
}

function isProtectedRoute(
  pathname: string
) {
  return PROTECTED_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`
      )
  );
}

function createRedirectResponse(
  request: NextRequest,
  path: string
) {
  return NextResponse.redirect(
    new URL(path, request.url)
  );
}

export async function middleware(
  req: NextRequest
) {
  const requestId =
    createMiddlewareRequestId();

  const start =
    performance.now();

  const pathname =
    req.nextUrl.pathname;

  const method = req.method;

  const res = NextResponse.next();

    // =========================================
    // EARLY BYPASS
    // =========================================

    if (
      isBypassRequest(
        pathname,
        method
      )
    ) {
      return res;
    }

  // =========================================
  // PUBLIC STATIC FILES
  // =========================================

  try {
    logMiddlewareStage(
      "middleware-request-started",
      {
        requestId,

        pathname,

        method,
      }
    );

    // =========================================
    // PUBLIC STATIC FILES
    // =========================================

    if (
      isPublicStaticFile(
        pathname
      )
    ) {
      logMiddlewareStage(
        "public-static-bypass",
        {
          requestId,

          pathname,
        }
      );

      return res;
    }

    // =========================================
    // PUBLIC API ROUTES
    // =========================================

    if (
      isPublicApiRoute(
        pathname
      )
    ) {
      logMiddlewareStage(
        "public-api-bypass",
        {
          requestId,

          pathname,
        }
      );

      return res;
    }

    // =========================================
    // ROUTE CLASSIFICATION
    // =========================================

    const protectedRoute =
      isProtectedRoute(
        pathname
      );

    const publicRoute =
      isPublicRoute(pathname);

    let user = null;

    // =========================================
    // CONDITIONAL AUTH LOOKUP
    // =========================================

    if (
      protectedRoute ||
      isAuthRoute(pathname)
    ) {
      const supabase =
        createServerClient(
          process.env
            .NEXT_PUBLIC_SUPABASE_URL!,

          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY!,

          {
            cookies: {
              getAll() {
                return req.cookies.getAll();
              },

              setAll(cookies) {
                cookies.forEach(
                  ({
                    name,
                    value,
                    options,
                  }) => {
                    res.cookies.set(
                      name,
                      value,
                      options
                    );
                  }
                );
              },
            },
          }
        );

      const {
        data,
        error: authError,
      } =
        await supabase.auth.getUser();

      user = data.user;

      if (authError) {
        logMiddlewareError(
          "auth-lookup-error",
          {
            requestId,
            authError,
          }
        );
      }
    }

    // =========================================
    // UNAUTHORIZED
    // =========================================

    if (
      !user &&
      !publicRoute
    ) {
      logMiddlewareStage(
        "unauthorized-redirect",
        {
          requestId,

          pathname,
        }
      );

      return createRedirectResponse(
        req,
        "/login"
      );
    }

    // =========================================
    // AUTH ROUTE REDIRECT
    // =========================================

    if (
      user &&
      isAuthRoute(pathname)
    ) {
      logMiddlewareStage(
        "authenticated-redirect",
        {
          requestId,

          pathname,

          userId: user.id,
        }
      );

      return createRedirectResponse(
        req,
        "/dashboard"
      );
    }

    const durationMs = Number(
      (
        performance.now() -
        start
      ).toFixed(2)
    );

    logMiddlewareStage(
      "middleware-request-completed",
      {
        requestId,

        pathname,

        authenticated:
          Boolean(user),

        durationMs,
      }
    );

    return res;
  } catch (error) {
    logMiddlewareError(
      "middleware-engine-error",
      {
        requestId,

        pathname,

        error,
      }
    );

    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|icon-192.png|icon-512.png|sw.js|robots.txt|sitemap.xml).*)",
  ],
};
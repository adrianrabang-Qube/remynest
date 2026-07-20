"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isNativePlatform } from "@/lib/platform";

/**
 * Root-entry-only redirect for the native iOS shell (Capacitor remote-URL
 * WebView — see capacitor.config.ts). The server can't distinguish native
 * from a browser (same URL, no distinguishing UA — lib/platform.ts), so
 * native detection runs here, client-side, after mount. Browsers render the
 * marketing landing page untouched; native always leaves it for /login,
 * where the existing middleware auth-route forward (isAuthRoute + user ->
 * /home) — unmodified — takes over from there. Renders nothing; mount only
 * on the root route, never on /login itself, so there is no redirect loop.
 */
export default function NativeEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isNativePlatform()) {
      router.replace("/login");
    }
  }, [router]);

  return null;
}

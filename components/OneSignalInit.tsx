"use client";

import { useEffect } from "react";
import Script from "next/script";
import { createClient } from "@/utils/supabase/client";

// Prevent double initialization in React dev mode / re-mounts.
let initialized = false;

/** True when running inside the Capacitor native shell (iOS/Android WKWebView). */
function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

/**
 * Post to the native OneSignal bridge (AppDelegate's WKScriptMessageHandler),
 * retrying until the handler is registered. Used only inside the native shell —
 * the native SDK owns the iOS push subscription; here we only forward identity.
 */
function postToNativeBridge(
  payload: Record<string, unknown>,
  attempts = 0,
): void {
  const handler = (
    window as unknown as {
      webkit?: {
        messageHandlers?: {
          oneSignalBridge?: { postMessage: (m: unknown) => void };
        };
      };
    }
  ).webkit?.messageHandlers?.oneSignalBridge;

  if (handler) {
    handler.postMessage(payload);
    return;
  }
  if (attempts < 50) {
    setTimeout(() => postToNativeBridge(payload, attempts + 1), 200);
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    async function initOneSignal() {
      if (initialized) return;
      initialized = true;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("❌ No authenticated user");
          return;
        }

        // NATIVE shell: the native OneSignal SDK (AppDelegate) created the iOS
        // (APNs) subscription. Bridge the Supabase user id to OneSignal.login so
        // external_id targeting (used by the reminder sender) reaches this device.
        // The Web SDK is NOT used here — WKWebView cannot create iOS push subs.
        if (isNativeApp()) {
          postToNativeBridge({ action: "login", externalId: user.id });
          console.log("✅ Native OneSignal bridge: login posted", user.id);
          return;
        }

        // WEB (desktop / mobile browser): unchanged Web SDK flow.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        let attempts = 0;
        while (!window.OneSignal && attempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }
        if (!window.OneSignal) {
          console.log("❌ OneSignal SDK missing");
          return;
        }

        await window.OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          allowLocalhostAsSecureOrigin: true,
        });
        await window.OneSignal.Notifications.requestPermission();
        await window.OneSignal.login(user.id);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const playerId = window.OneSignal.User?.PushSubscription?.id;

        if (playerId && session?.access_token) {
          const response = await fetch("/api/register-device", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ playerId }),
          });
          const result = await response.json();
          console.log("✅ Device registration result:", result);
        } else {
          console.log("❌ Missing playerId or session token");
        }
      } catch (err) {
        console.error("❌ OneSignal init error:", err);
      }
    }

    initOneSignal();
  }, []);

  // Load the OneSignal Web SDK script (browsers use it; inside the native shell the
  // effect above never calls `OneSignal.init`, so it stays inert and the native SDK
  // owns push). Rendered unconditionally to keep SSR/client markup identical.
  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}

"use client";

import { useEffect } from "react";
import Script from "next/script";
import { createClient } from "@/utils/supabase/client";

// ---------------------------------------------------------------------------
// Resilient OneSignal identity lifecycle.
//
// The previous implementation ran ONCE (module guard + useEffect([])) and, on
// native, was fire-and-forget with no acknowledgement — so a single race
// (getUser() null during hydration, Web SDK not yet loaded, the native bridge
// handler not yet registered) left the device with an active push subscription
// but NO external_id, which surfaced as `invalid_aliases` at reminder send time.
//
// This version drives login from Supabase auth-state events and RE-ATTEMPTS until
// it actually succeeds, and never marks success until login completes (web:
// login() resolves; native: AppDelegate posts an ack back via __oneSignalBridgeAck).
//
// Module-level state survives client navigations / remounts within the same
// WebView/page session (reset only on a full reload). `*ConfirmedFor` holds the
// userId whose login is confirmed, making re-attempts idempotent (no spam once
// confirmed, but a fresh attempt whenever the user changes or a prior try failed).
// ---------------------------------------------------------------------------

let webSdkInitStarted = false;
let bridgeAckInstalled = false;
let webLoginConfirmedFor: string | null = null;
let nativeLoginConfirmedFor: string | null = null;

function logIdentity(
  stage: string,
  data: Record<string, unknown> = {},
): void {
  console.info(`[onesignal-identity] ${stage}`, data);
}

/** True when running inside the Capacitor native shell (iOS/Android WKWebView). */
function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

function bridgeHandler():
  | { postMessage: (m: unknown) => void }
  | undefined {
  return (
    window as unknown as {
      webkit?: {
        messageHandlers?: {
          oneSignalBridge?: { postMessage: (m: unknown) => void };
        };
      };
    }
  ).webkit?.messageHandlers?.oneSignalBridge;
}

/**
 * Post to the native OneSignal bridge (AppDelegate's WKScriptMessageHandler),
 * retrying until the handler is registered. The native SDK owns the iOS push
 * subscription; here we only forward identity (login/logout).
 */
function postToNativeBridge(
  payload: Record<string, unknown>,
  attempts = 0,
): void {
  const handler = bridgeHandler();
  if (handler) {
    handler.postMessage(payload);
    return;
  }
  if (attempts < 50) {
    setTimeout(() => postToNativeBridge(payload, attempts + 1), 200);
  }
}

/**
 * Install the native -> web acknowledgement receiver ONCE. After AppDelegate runs
 * `OneSignal.login(externalId)` it calls `window.__oneSignalBridgeAck({ externalId,
 * status })` via evaluateJavaScript, so the web layer learns the bridge login
 * actually executed. (Older native builds without the ack simply never confirm; we
 * then keep re-posting on each auth event — harmless, OneSignal.login is idempotent.)
 */
function ensureBridgeAck(): void {
  if (bridgeAckInstalled) return;
  bridgeAckInstalled = true;
  (
    window as unknown as {
      __oneSignalBridgeAck?: (ack: {
        externalId?: string;
        status?: string;
      }) => void;
    }
  ).__oneSignalBridgeAck = (ack) => {
    if (ack?.status === "ok" && typeof ack.externalId === "string") {
      nativeLoginConfirmedFor = ack.externalId;
      logIdentity("native-bridge-login-confirmed", {
        externalId: ack.externalId,
      });
    } else {
      logIdentity("login-failed", { platform: "native", ack });
    }
  };
}

/** Wait for the Web SDK to load, then init + request permission ONCE. */
async function ensureWebSdkReady(): Promise<boolean> {
  let attempts = 0;
  while (!window.OneSignal && attempts < 50) {
    await new Promise((r) => setTimeout(r, 200));
    attempts++;
  }
  const os = window.OneSignal;
  if (!os) return false;
  if (!webSdkInitStarted) {
    webSdkInitStarted = true;
    await os.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: true,
    });
    await os.Notifications.requestPermission();
  }
  return true;
}

/**
 * Preserve the existing web device registration (stores the web player_id in
 * `device_registrations`). Best-effort — never blocks identity on it.
 */
async function registerWebDevice(
  accessToken: string | undefined,
): Promise<void> {
  try {
    await new Promise((r) => setTimeout(r, 3000));
    const playerId = window.OneSignal?.User?.PushSubscription?.id;
    if (playerId && accessToken) {
      await fetch("/api/register-device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ playerId }),
      });
    }
  } catch {
    // best-effort; device registration must never block identity
  }
}

/**
 * Attempt OneSignal.login for `userId`. Idempotent (skips if already confirmed for
 * this userId). NEVER marks success until login actually completes — web: login()
 * resolves; native: the AppDelegate ack flips `nativeLoginConfirmedFor`.
 */
async function attemptLogin(
  userId: string,
  accessToken: string | undefined,
  reason: string,
): Promise<void> {
  if (isNativeApp()) {
    if (nativeLoginConfirmedFor === userId) return;
    ensureBridgeAck();
    logIdentity("login-attempted", { platform: "native", userId, reason });
    logIdentity("native-bridge-login-requested", { externalId: userId });
    postToNativeBridge({ action: "login", externalId: userId });
    // Confirmation arrives asynchronously via __oneSignalBridgeAck.
    return;
  }

  if (webLoginConfirmedFor === userId) return;
  logIdentity("login-attempted", { platform: "web", userId, reason });
  const ready = await ensureWebSdkReady();
  const os = window.OneSignal;
  if (!ready || !os) {
    logIdentity("login-failed", {
      platform: "web",
      userId,
      reason: "sdk-unavailable",
    });
    return;
  }
  try {
    await os.login(userId);
    webLoginConfirmedFor = userId;
    logIdentity("login-succeeded", { platform: "web", userId });
    void registerWebDevice(accessToken);
  } catch (err) {
    logIdentity("login-failed", {
      platform: "web",
      userId,
      error: String(err),
    });
  }
}

/** Detach identity on sign-out so the next user on this device never inherits it. */
function handleLogout(): void {
  webLoginConfirmedFor = null;
  nativeLoginConfirmedFor = null;
  try {
    if (isNativeApp()) {
      postToNativeBridge({ action: "logout" });
    } else {
      const os = window.OneSignal;
      if (webSdkInitStarted && os) void os.logout();
    }
  } catch {
    // best-effort
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    const supabase = createClient();

    // Resilient lifecycle: (re)attempt login on EVERY auth event that yields a
    // valid user — INITIAL_SESSION (page load with a restored session), SIGNED_IN,
    // TOKEN_REFRESHED, USER_UPDATED — so a one-time race (getUser null, SDK not
    // loaded, bridge not yet registered) self-heals instead of being permanent.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        handleLogout();
        return;
      }
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const userId = session?.user?.id;
        if (userId) {
          void attemptLogin(userId, session?.access_token, event);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load the OneSignal Web SDK script (browsers use it; inside the native shell the
  // lifecycle above only bridges identity, so the Web SDK stays inert and the
  // native SDK owns push). Rendered unconditionally to keep SSR/client markup identical.
  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}

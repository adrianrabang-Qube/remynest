"use client";

import { useEffect } from "react";

import { Remy } from "@/lib/remy";

/**
 * Connectivity → Remy. A tiny app-shell bridge that turns the browser's online/offline events
 * into semantic Remy events, so the Brain knows the app's connectivity throughout the session.
 * It imports ONLY the public API (`@/lib/remy`) and renders nothing — mount it once in the app
 * shell (inside <RemyProvider>). No UI, no business logic.
 */
export default function RemyConnectivityBridge() {
  useEffect(() => {
    const goOffline = () => Remy.emit("offline");
    const goOnline = () => Remy.emit("online");

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Seed the current state (in case the app loaded while already offline).
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      Remy.emit("offline");
    }

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return null;
}

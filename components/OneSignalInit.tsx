"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    OneSignal: any;
  }
}

// Prevent double initialization in React dev mode
let initialized = false;

export default function OneSignalInit() {
  useEffect(() => {
    async function initOneSignal() {
      // Prevent duplicate SDK init
      if (initialized) return;

      initialized = true;

      try {
        const supabase = createClient();

        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("✅ Supabase user:", user);

        if (!user) {
          console.log("❌ No authenticated user");
          return;
        }

        // WAIT until SDK exists
        let attempts = 0;

        while (!window.OneSignal && attempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }

        if (!window.OneSignal) {
          console.log("❌ OneSignal SDK missing");
          return;
        }

        console.log("✅ OneSignal SDK loaded");

        // Initialize OneSignal
        await window.OneSignal.init({
          appId:
            process.env
              .NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          allowLocalhostAsSecureOrigin: true,
        });

        console.log("✅ OneSignal initialized");

        // Ask notification permission
        await window.OneSignal.Notifications.requestPermission();

        console.log(
          "✅ Permission:",
          Notification.permission
        );

        // Login user to OneSignal
        await window.OneSignal.login(user.id);

        console.log(
          "✅ Logged into OneSignal:",
          user.id
        );

        console.log(
          "✅ External ID:",
          window.OneSignal.User?.externalId
        );

        // Wait for subscription registration
        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );

        // Get OneSignal player ID
        const playerId =
          window.OneSignal.User
            ?.PushSubscription?.id;

        console.log(
          "✅ Subscription ID:",
          playerId
        );

        // Register device securely
        if (playerId && session?.access_token) {
          const response = await fetch(
            "/api/register-device",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                playerId,
              }),
            }
          );

          const result = await response.json();

          console.log(
            "✅ Device registration result:",
            result
          );
        } else {
          console.log(
            "❌ Missing playerId or session token"
          );
        }

      } catch (err) {
        console.error(
          "❌ OneSignal init error:",
          err
        );
      }
    }

    initOneSignal();
  }, []);

  return null;
}
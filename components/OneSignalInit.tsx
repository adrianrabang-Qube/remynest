"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    OneSignal: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    async function initOneSignal() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

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

        await window.OneSignal.init({
          appId:
            process.env
              .NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          allowLocalhostAsSecureOrigin: true,
        });

        console.log("✅ OneSignal initialized");

        await window.OneSignal.Notifications.requestPermission();

        console.log(
          "✅ Permission:",
          Notification.permission
        );

        await window.OneSignal.login(user.id);

        console.log(
          "✅ Logged into OneSignal:",
          user.id
        );

        console.log(
          "✅ External ID:",
          window.OneSignal.User?.externalId
        );

        console.log(
          "✅ Subscription ID:",
          window.OneSignal.User
            ?.PushSubscription?.id
        );

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
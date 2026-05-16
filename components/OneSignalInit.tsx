"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    async function initOneSignal() {
      const supabase = createClient();

      // WAIT slightly for auth hydration
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log(
          "❌ No authenticated user"
        );
        return;
      }

      console.log(
        "✅ Supabase user:",
        user.id
      );

      window.OneSignalDeferred =
        window.OneSignalDeferred || [];

      window.OneSignalDeferred.push(
        async function () {
          await window.OneSignal.init({
            appId:
              process.env
                .NEXT_PUBLIC_ONESIGNAL_APP_ID!,

            allowLocalhostAsSecureOrigin: true,
          });

          console.log(
            "✅ OneSignal initialized"
          );

          await window.OneSignal
            .Notifications
            .requestPermission();

          console.log(
            "🔔 Permission:",
            Notification.permission
          );

          // LOGIN USER
          await window.OneSignal.login(
            user.id
          );

          console.log(
            "✅ Logged into OneSignal:",
            user.id
          );

          // WAIT FOR INTERNAL UPDATE
          await new Promise((resolve) =>
            setTimeout(resolve, 1500)
          );

          console.log(
            "✅ OneSignal externalId:",
            window.OneSignal.User
              ?.externalId
          );
        }
      );
    }

    initOneSignal();
  }, []);

  return null;
}
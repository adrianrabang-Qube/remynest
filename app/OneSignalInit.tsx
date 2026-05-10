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

      // WAIT for auth session properly
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log("❌ No authenticated user");
        return;
      }

      const user = session.user;

      console.log("✅ Supabase user:", user.id);

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

          // LOGIN USER TO ONESIGNAL
          await window.OneSignal.login(
            user.id
          );

          console.log(
            "✅ Logged into OneSignal:",
            user.id
          );

          // VERIFY EXTERNAL ID
          const externalId =
            window.OneSignal.User?.externalId;

          console.log(
            "✅ OneSignal externalId:",
            externalId
          );
        }
      );
    }

    initOneSignal();
  }, []);

  return null;
}
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
    async function init() {
      try {
        if (!window.OneSignal) {
          console.log("❌ OneSignal missing");
          return;
        }

        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        console.log("✅ Supabase user:", user);

        if (!user) {
          return;
        }

        await window.OneSignal.init({
          appId:
            process.env
              .NEXT_PUBLIC_ONESIGNAL_APP_ID,

          allowLocalhostAsSecureOrigin: true,
        });

        console.log(
          "✅ OneSignal initialized"
        );

        await window.OneSignal
          .Notifications.requestPermission();

        console.log(
          "✅ Permission granted"
        );

        await window.OneSignal.login(
          user.id
        );

        console.log(
          "✅ Logged into OneSignal:",
          user.id
        );

        console.log(
          "✅ External ID:",
          window.OneSignal.User
            ?.externalId
        );

        console.log(
          "✅ Subscription ID:",
          window.OneSignal.User
            ?.PushSubscription?.id
        );

      } catch (err) {
        console.error(
          "❌ OneSignal crash:",
          err
        );
      }
    }

    const timer = setTimeout(() => {
      init();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
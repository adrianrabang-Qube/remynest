"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    window.OneSignalDeferred =
      window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(
      async function () {
        await window.OneSignal.init({
          appId:
            process.env
              .NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        });

        console.log(
          "✅ OneSignal initialized"
        );

        console.log(
          "🔔 Permission:",
          Notification.permission
        );

        await window.OneSignal.login(
          "test-user"
        );

        console.log(
          "✅ Logged into OneSignal"
        );
      }
    );
  }, []);

  return null;
}
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
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log(
            "❌ No authenticated user"
          );
          return;
        }

        window.OneSignalDeferred =
          window.OneSignalDeferred || [];

        window.OneSignalDeferred.push(
          async function () {
            try {
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

              if (
                Notification.permission !==
                "granted"
              ) {
                console.log(
                  "❌ Push permission denied"
                );
                return;
              }

              await window.OneSignal.login(
                user.id
              );

              console.log(
                "✅ Logged into OneSignal:",
                user.id
              );

              const externalId =
                window.OneSignal.User
                  ?.externalId;

              console.log(
                "✅ OneSignal external ID:",
                externalId
              );

              const subscriptionId =
                window.OneSignal.User
                  ?.PushSubscription?.id;

              console.log(
                "✅ Push Subscription ID:",
                subscriptionId
              );
            } catch (err) {
              console.log(
                "❌ OneSignal init error:"
              );

              console.log(err);
            }
          }
        );
      } catch (err) {
        console.log(
          "❌ OUTER INIT ERROR:"
        );

        console.log(err);
      }
    }

    initOneSignal();
  }, []);

  return null;
}
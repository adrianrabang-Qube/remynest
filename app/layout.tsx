"use client";

import "./globals.css";

import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";

import QueryProvider from "@/components/QueryProvider";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

function OneSignalInit() {
  useEffect(() => {
    async function init() {
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

        if (!window.OneSignalDeferred) {
          window.OneSignalDeferred = [];
        }

        window.OneSignalDeferred.push(
          async function (OneSignal: any) {
            console.log(
              "✅ OneSignal SDK loaded"
            );

            await OneSignal.init({
              appId:
                process.env
                  .NEXT_PUBLIC_ONESIGNAL_APP_ID!,

              allowLocalhostAsSecureOrigin: true,
            });

            console.log(
              "✅ OneSignal initialized"
            );

            const permission =
              await OneSignal.Notifications.requestPermission();

            console.log(
              "✅ Notification permission:",
              permission
            );

            await OneSignal.login(user.id);

            console.log(
              "✅ Logged into OneSignal:",
              user.id
            );

            const externalId =
              await OneSignal.User.externalId;

            console.log(
              "✅ OneSignal externalId:",
              externalId
            );

            const subscriptionId =
              await OneSignal.User
                .PushSubscription.id;

            console.log(
              "✅ Push Subscription ID:",
              subscriptionId
            );
          }
        );
      } catch (err) {
        console.error(
          "❌ OneSignal init error:",
          err
        );
      }
    }

    init();
  }, []);

  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <OneSignalInit />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
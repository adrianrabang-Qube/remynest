"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred: any[];
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.OneSignalDeferred) {
      window.OneSignalDeferred = [];
    }

    window.OneSignalDeferred.push(async function (OneSignal: any) {
      await OneSignal.init({
        appId: "0783b302-cb5a-474a-9f28-79869c2c0e03",
      });

      console.log("OneSignal READY");

      try {
        const id = await OneSignal.User.PushSubscription.id;

        console.log("OneSignal ID:", id);

        if (!id) return;

        await fetch("/api/save-onesignal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            onesignal_id: id,
          }),
        });

        console.log("Saved OneSignal ID to backend");
      } catch (err) {
        console.error("OneSignal error:", err);
      }
    });
  }, []);

  return null;
}
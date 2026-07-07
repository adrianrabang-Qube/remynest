"use client";

import { useEffect, useRef } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";

import {
  isNativeReminderTarget,
  type LocalReminder,
} from "@/lib/native-reminders";

/**
 * Reports which reminders the device currently holds a PENDING local notification for,
 * so the reminder cron can skip the redundant OneSignal push for them (the iOS
 * duplicate-notification fix). Renders nothing.
 *
 * This is ADDITIVE — it does NOT touch the frozen native scheduler (native-reminders.ts /
 * NativeReminderSync); it only READS `LocalNotifications.getPending()` (the ground truth
 * of what will actually fire) and posts those reminder ids. It runs slightly AFTER a list
 * change so NativeReminderSync's reconcile has scheduled first. Best-effort and a no-op
 * off native iOS. If nothing is pending (e.g. permission denied), it reports nothing —
 * so the cron keeps sending the push (the fix fails toward delivery, never a silent miss).
 */
export default function NativeReminderBeacon({
  reminders,
}: {
  reminders: LocalReminder[];
}) {
  const lastSent = useRef<string>("");

  // Re-run when the schedulable shape of the list changes (mirrors NativeReminderSync).
  const signature = JSON.stringify(
    reminders.map((r) => [r.id, r.remind_at, r.recurring, r.frequency, r.completed])
  );

  useEffect(() => {
    if (!isNativeReminderTarget()) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const pending = await LocalNotifications.getPending();
        const ids = [
          ...new Set(
            pending.notifications
              .map(
                (n) =>
                  (n.extra as { reminderId?: string } | undefined)?.reminderId
              )
              .filter((x): x is string => typeof x === "string" && x.length > 0)
          ),
        ];
        if (cancelled || ids.length === 0) return;

        const key = ids.slice().sort().join(",");
        if (key === lastSent.current) return; // nothing changed since the last report

        const res = await fetch("/api/reminders/native-active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminderIds: ids }),
        });
        if (res.ok) lastSent.current = key;
      } catch {
        // best-effort; must never disrupt the reminders screen
      }
    }, 2000); // let NativeReminderSync finish scheduling first

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import {
  reconcileLocalReminders,
  type LocalReminder,
} from "@/lib/native-reminders";

/**
 * Mirrors the (server-rendered) reminder list into on-device iOS local notifications.
 * Renders nothing. Re-reconciles whenever the schedulable shape of the list changes —
 * create / edit / delete / complete all re-render this list after their server action
 * revalidates the page, so notifications stay in sync without per-action hooks. On the
 * web (and Android) `reconcileLocalReminders` is a no-op.
 */
export default function NativeReminderSync({
  reminders,
}: {
  reminders: LocalReminder[];
}) {
  // Always reconcile against the latest list (read via ref so it isn't an effect dep).
  const latest = useRef(reminders);

  // Keep the ref current in an effect — mutating a ref during render is disallowed
  // (react-hooks/refs); effects run after commit, so this is the safe place to sync.
  useEffect(() => {
    latest.current = reminders;
  });

  // Stable signature so we only reconcile when something schedulable actually changes.
  const signature = JSON.stringify(
    reminders.map((r) => [
      r.id,
      r.remind_at,
      r.recurring,
      r.frequency,
      r.completed,
      r.title,
    ]),
  );

  useEffect(() => {
    void reconcileLocalReminders(latest.current);
  }, [signature]);

  return null;
}

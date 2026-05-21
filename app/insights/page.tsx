import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import InsightsClient from "@/components/insights/InsightsClient";

export const dynamic =
  "force-dynamic";

export default async function InsightsPage() {

  const supabase =
    await createClient();

  // =====================================
  // AUTHENTICATED USER
  // =====================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // =====================================
  // MEMORIES
  // =====================================

  const {
    data: memories,
  } = await supabase
    .from("memories")
    .select(`
      id,
      ai_mood,
      ai_category,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  // =====================================
  // REMINDERS
  // =====================================

  const {
    data: reminders,
  } = await supabase
    .from("reminders")
    .select(`
      id,
      completed,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  // =====================================
  // SAFETY FALLBACKS
  // =====================================

  const safeMemories =
    memories || [];

  const safeReminders =
    reminders || [];

  // =====================================
  // RETURN
  // =====================================

  return (
    <InsightsClient
      memories={safeMemories}
      reminders={safeReminders}
    />
  );
}
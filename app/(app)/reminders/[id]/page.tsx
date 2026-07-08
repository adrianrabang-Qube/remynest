import { createClient } from "@/lib/supabase/server"
import { userCanAccessProfile } from "@/lib/profile-ownership"
import { redirect, notFound } from "next/navigation"

export default async function ReminderPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // 🔐 Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) {
    notFound();
  }

  // 🔒 Authorize in app code (independent of RLS): a personal ("My Nest") reminder is
  // owned by user_id; a care reminder requires access to its memory_profile. Prevents a
  // cross-user read of a null-profile reminder by UUID enumeration if RLS is not a backstop.
  const authorized =
    data.memory_profile_id == null
      ? data.user_id === user.id
      : await userCanAccessProfile(user.id, data.memory_profile_id);

  if (!authorized) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="mb-4 font-serif text-2xl font-semibold text-charcoal md:text-3xl">
        Reminder
      </h1>
      <pre className="overflow-x-auto rounded-2xl border border-sand-deep/60 bg-white p-4 text-xs text-charcoal-soft shadow-soft">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

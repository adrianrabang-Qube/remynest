import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { validateAndResolveMemoryDate } from "@/lib/memories/memory-date";
import {
  getDateCoverage,
  getMemoriesMissingDates,
} from "@/lib/remy/date-coverage";
import MemoryDatesBackfill from "@/components/memory-dates/MemoryDatesBackfill";

export const dynamic = "force-dynamic";

/**
 * Save ONLY the memory date columns — never touches title/content/attachments,
 * so backfilling can't disturb existing memory data. Scoped by user_id;
 * returns a structured result (never throws). Revalidates the surfaces that
 * read effective dates so newly dated memories appear immediately.
 */
async function saveMemoryDate(
  memoryId: string,
  memoryDate: string | null,
  precision: string
): Promise<{ ok: boolean; error?: string }> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const resolved = validateAndResolveMemoryDate(memoryDate, precision);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  if (!resolved.memoryDate) {
    return { ok: false, error: "Please choose a date first." };
  }

  const { error } = await supabase
    .from("memories")
    .update({
      memory_date: resolved.memoryDate,
      memory_date_precision: resolved.precision,
    })
    .eq("id", memoryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Couldn't save the date. Please try again." };
  }

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath("/memory-dates");
  return { ok: true };
}

export default async function MemoryDatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Scope to the active workspace — a care profile, or My Nest (null).
  const activeContext = await getActiveContext();
  const memoryProfileId =
    activeContext?.type === "CARE" ? activeContext.profileId : null;

  const [coverage, missing] = await Promise.all([
    getDateCoverage(supabase, memoryProfileId),
    getMemoriesMissingDates(supabase, memoryProfileId, 100),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-charcoal">Memory dates</h1>
        <p className="mt-2 text-charcoal-soft">
          Tell Remy when these memories happened. Even a rough year or decade
          helps place them on the timeline.
        </p>
      </header>

      <MemoryDatesBackfill
        coverage={coverage}
        memories={missing}
        saveAction={saveMemoryDate}
      />
    </main>
  );
}

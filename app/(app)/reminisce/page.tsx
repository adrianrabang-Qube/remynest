import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { getReminiscence } from "@/lib/remy/reminiscence";
import ReminiscenceCard from "@/components/reminisce/ReminiscenceCard";

export const dynamic = "force-dynamic";

const SPARSE_THRESHOLD = 3;

export default async function ReminiscePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeContext = await getActiveContext();
  const memoryProfileId =
    activeContext?.type === "CARE" ? activeContext.profileId : null;

  // Care-recipient name for a warm, personal Remy introduction.
  let subjectName: string | null = null;
  if (memoryProfileId) {
    const { data } = await supabase
      .from("memory_profiles")
      .select("preferred_name, profile_name")
      .eq("id", memoryProfileId)
      .maybeSingle();
    subjectName =
      data?.preferred_name?.trim() || data?.profile_name?.trim() || null;
  }

  const { totalDated, eras } = await getReminiscence(
    supabase,
    memoryProfileId
  );

  const intro = subjectName
    ? `These are some memories from ${subjectName}'s life — let's look back together.`
    : `Let's revisit some memories together.`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold text-charcoal">Reminisce</h1>
        <p className="mt-3 text-xl leading-relaxed text-charcoal-soft">
          {intro}
        </p>
      </header>

      {totalDated === 0 ? (
        <EmptyState />
      ) : (
        <>
          {totalDated < SPARSE_THRESHOLD && <SparseNote />}
          <div className="space-y-12">
            {eras.map((era) => (
              <section key={era.startYear}>
                <div className="mb-5">
                  <h2 className="text-3xl font-semibold text-charcoal">
                    {era.label}
                  </h2>
                  <p className="mt-1 text-lg text-charcoal-soft">
                    Let&apos;s revisit {era.memoryCount}{" "}
                    {era.memoryCount === 1 ? "memory" : "memories"} from the{" "}
                    {era.label}.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {era.memories.map((memory) => (
                    <ReminiscenceCard key={memory.id} memory={memory} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 shadow-soft">
      <p className="text-xl font-semibold text-charcoal">
        There&apos;s nothing to look back on just yet.
      </p>
      <p className="mt-3 text-lg leading-relaxed text-charcoal-soft">
        Reminiscence comes to life once memories have dates — a year or even a
        decade is enough for Remy to place them in time and gather them by era.
      </p>
      <Link
        href="/memory-dates"
        className="mt-6 inline-flex items-center rounded-full bg-sage px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-sage-deep"
      >
        Add memory dates
      </Link>
    </div>
  );
}

function SparseNote() {
  return (
    <div className="mb-10 rounded-3xl border border-gold/40 bg-gold/[0.07] p-6 shadow-soft">
      <p className="text-lg text-charcoal-soft">
        Only a few memories have dates so far. Adding more dates helps Remy
        gather richer eras to look back on.
      </p>
      <Link
        href="/memory-dates"
        className="mt-3 inline-flex items-center text-base font-semibold text-sage-deep underline-offset-2 hover:underline"
      >
        Add memory dates →
      </Link>
    </div>
  );
}

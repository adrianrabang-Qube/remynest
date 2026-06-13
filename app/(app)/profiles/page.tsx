import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getFamilyIntelligence } from "@/lib/remy/family";
import PersonRow from "@/components/profile/people/PersonRow";

export const dynamic = "force-dynamic";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * People directory (/profiles) — everyone in the care network. Each row links to
 * that person's canonical profile. Memory counts come from a single
 * getFamilyIntelligence call over all profiles (no N+1).
 */
export default async function ProfilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiles = await getAccessibleProfiles();

  const people = profiles.map((p) => ({
    id: p.id,
    name: str(p.preferred_name) ?? str(p.profile_name) ?? "Care profile",
    photo: str(p.profile_photo),
    relationship: str(p.relationship_type),
  }));

  const family = people.length
    ? await getFamilyIntelligence(
        supabase,
        people.map((p) => ({ id: p.id, name: p.name })),
      )
    : null;
  const countById = new Map(
    (family?.profiles ?? []).map((s) => [s.id, s.memoryCount]),
  );

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-charcoal md:text-2xl">People</h1>
        <p className="mt-0.5 text-sm text-charcoal-muted">
          Everyone in your care network
        </p>
      </header>

      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sand-deep/70 bg-white p-6 text-center text-sm text-charcoal-muted">
          No care profiles yet. People you add or who are shared with you appear
          here.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-sand-deep/60 bg-white shadow-soft">
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              memoryCount={countById.get(person.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

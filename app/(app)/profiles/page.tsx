import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getFamilyIntelligence } from "@/lib/remy/family";
import { computeCoverage } from "@/lib/remy/date-coverage";
import { buildPersonUnderstanding } from "@/lib/remy/understanding";
import PersonRow from "@/components/profile/people/PersonRow";
import AddPersonButton from "@/components/profile/people/AddPersonButton";
import { RemyStage } from "@/lib/remy";

export const dynamic = "force-dynamic";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseBirthYear(dob: string | null): number | null {
  if (!dob) return null;
  const year = new Date(dob).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/**
 * People directory (/profiles) — everyone in the care network. Each row leads
 * with what Remy understands about that person (one-line lens summary), reusing
 * buildPersonUnderstanding. All per-person stats + themes come from a single
 * getFamilyIntelligence call over all profiles (no N+1).
 */
export default async function ProfilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiles = await getAccessibleProfiles();

  const named = profiles.map((p) => ({
    id: p.id,
    name: str(p.preferred_name) ?? str(p.profile_name) ?? "Care profile",
    photo: str(p.profile_photo),
    relationship: str(p.relationship_type),
    birthYear: parseBirthYear(str(p.date_of_birth)),
  }));

  const family = named.length
    ? await getFamilyIntelligence(
        supabase,
        named.map((p) => ({ id: p.id, name: p.name })),
      )
    : null;
  const statById = new Map((family?.profiles ?? []).map((s) => [s.id, s]));

  const rows = named.map((p) => {
    const stat = statById.get(p.id);
    const memoryCount = stat?.memoryCount ?? 0;
    const datedCount = stat?.datedCount ?? 0;
    const understanding = buildPersonUnderstanding({
      subject: { id: p.id, name: p.name },
      memoryCount,
      datedCount,
      chapterCount: stat?.chapterCount ?? 0,
      themes: stat?.themes ?? [],
      coveragePercentage: computeCoverage(memoryCount, datedCount).percentage,
      // Decade buckets aren't loaded in the directory (the person page derives
      // the strongest-period facet); the summary uses themes/coverage/relationship.
      decades: [],
      birthYear: p.birthYear,
      relationshipLabel: p.relationship ? titleCase(p.relationship) : null,
      lastActivityAt: stat?.lastActivityAt ?? null,
    });
    return {
      person: {
        id: p.id,
        name: p.name,
        photo: p.photo,
        relationship: p.relationship,
      },
      understanding,
    };
  });

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-charcoal md:text-2xl">People</h1>
          <p className="mt-0.5 text-sm text-charcoal-muted">
            Everyone in your care network
          </p>
        </div>
        {rows.length > 0 && <AddPersonButton />}
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-deep/70 bg-white p-6 text-center">
          <RemyStage context="people.empty" size={112} className="mx-auto mb-2" />
          <p className="text-sm text-charcoal-soft">No people yet.</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            Add a person you care for to keep their memories organised — or they&apos;ll
            appear here when shared with you.
          </p>
          <div className="mt-4 flex justify-center">
            <AddPersonButton />
          </div>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-sand-deep/60 bg-white shadow-soft">
          {rows.map(({ person, understanding }) => (
            <PersonRow
              key={person.id}
              person={person}
              understanding={understanding}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

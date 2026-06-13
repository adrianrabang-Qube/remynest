import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { resolveAccountIdentity } from "@/lib/account-identity";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { computeCoverage } from "@/lib/remy/date-coverage";

import ProfileOverviewCard from "@/components/profile/identity/ProfileOverviewCard";
import ProfileLifeSnapshot from "@/components/profile/identity/ProfileLifeSnapshot";
import ProfileCoverageCard from "@/components/profile/identity/ProfileCoverageCard";
import ProfileHighlightsCard from "@/components/profile/identity/ProfileHighlightsCard";

export const dynamic = "force-dynamic";

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const identity = await resolveAccountIdentity();
  const activeProfileId = await resolveActiveProfileId();

  // Active care subject (if a care workspace) — provides photo + date of birth.
  let careProfile:
    | {
        profile_name: string | null;
        preferred_name: string | null;
        date_of_birth: string | null;
        profile_photo: string | null;
      }
    | null = null;
  if (activeProfileId) {
    const { data } = await supabase
      .from("memory_profiles")
      .select("profile_name, preferred_name, date_of_birth, profile_photo")
      .eq("id", activeProfileId)
      .maybeSingle();
    careProfile = data ?? null;
  }

  // Workspace-scoped memory counts — same scoping the dashboard uses
  // (memory_profile_id = active profile for care, IS NULL for My Nest). RLS
  // still scopes by user; this only narrows to the active workspace.
  let totalQuery = supabase
    .from("memories")
    .select("*", { count: "exact", head: true });
  totalQuery = activeProfileId
    ? totalQuery.eq("memory_profile_id", activeProfileId)
    : totalQuery.is("memory_profile_id", null);

  let datedQuery = supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .not("memory_date", "is", null);
  datedQuery = activeProfileId
    ? datedQuery.eq("memory_profile_id", activeProfileId)
    : datedQuery.is("memory_profile_id", null);

  let firstQuery = supabase.from("memories").select("created_at");
  firstQuery = activeProfileId
    ? firstQuery.eq("memory_profile_id", activeProfileId)
    : firstQuery.is("memory_profile_id", null);

  let latestQuery = supabase.from("memories").select("created_at");
  latestQuery = activeProfileId
    ? latestQuery.eq("memory_profile_id", activeProfileId)
    : latestQuery.is("memory_profile_id", null);

  const [{ count: total }, { count: dated }, firstResult, latestResult] =
    await Promise.all([
      totalQuery,
      datedQuery,
      firstQuery.order("created_at", { ascending: true }).limit(1),
      latestQuery.order("created_at", { ascending: false }).limit(1),
    ]);

  const firstDate = firstResult.data?.[0]?.created_at ?? null;
  const latestDate = latestResult.data?.[0]?.created_at ?? null;

  // Reused intelligence (same loaders as Dashboard / Library).
  const [collections, connections, chapters, accessibleProfiles] = await Promise.all([
    getRemyCollections(supabase, user.id, { limit: 12, includeDetails: true }),
    getRemyConnections(supabase, user.id, { limit: 12 }),
    getRemyLifeChapters(supabase, user.id, { sort: "count", limit: 12 }),
    getAccessibleProfiles(),
  ]);

  const memoryCount = total ?? 0;
  const datedCount = dated ?? 0;
  const coverage = computeCoverage(memoryCount, datedCount);

  const isCare = Boolean(activeProfileId);
  const name = isCare
    ? careProfile?.preferred_name || careProfile?.profile_name || "Care profile"
    : identity?.summary.fullName ?? "You";
  const photoUrl = isCare
    ? careProfile?.profile_photo ?? null
    : identity?.summary.avatarUrl ?? null;
  const age = isCare ? ageFromDob(careProfile?.date_of_birth) : null;
  const planLabel = identity?.summary.plan
    ? identity.summary.plan === "premium"
      ? "Premium"
      : "Free"
    : null;

  const topChapter = chapters[0]
    ? {
        label: chapters[0].title,
        meta: `${chapters[0].memoryCount} memories`,
        href: "/chapters",
      }
    : null;
  const topCollection = collections[0]
    ? { label: collections[0].title, href: "/collections" }
    : null;
  const strongestConnection = connections[0]
    ? {
        label: connections[0].title,
        meta: `${connections[0].connectedCount} connected`,
        href: "/connections",
      }
    : null;

  const peopleCount = (accessibleProfiles ?? []).length;

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <ProfileOverviewCard
        name={name}
        photoUrl={photoUrl}
        age={age}
        contextLabel={isCare ? "Care profile" : "My Nest"}
        planLabel={planLabel}
      />

      <ProfileLifeSnapshot
        memories={memoryCount}
        collections={collections.length}
        connections={connections.length}
        chapters={chapters.length}
      />

      <ProfileCoverageCard
        firstDate={firstDate}
        latestDate={latestDate}
        percentage={coverage.percentage}
        total={coverage.total}
        dated={coverage.dated}
      />

      {peopleCount > 0 && (
        <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6">
          <h2 className="text-lg font-semibold text-charcoal">Relationships</h2>
          <div className="mt-2 flex items-center gap-3 text-sm text-charcoal-soft">
            <Users className="h-5 w-5 shrink-0 text-sage" aria-hidden />
            <span>
              <span className="font-semibold text-charcoal">{peopleCount}</span>{" "}
              {peopleCount === 1 ? "person" : "people"} in your care
            </span>
          </div>
        </section>
      )}

      <ProfileHighlightsCard
        topChapter={topChapter}
        topCollection={topCollection}
        strongestConnection={strongestConnection}
      />

      {/* Account — settings is now secondary, reached from the identity layer. */}
      <Link
        href="/settings"
        className="flex items-center justify-between gap-3 rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft transition hover:shadow-soft-lg md:p-6"
      >
        <div>
          <p className="text-sm font-semibold text-charcoal">Account &amp; settings</p>
          <p className="text-xs text-charcoal-muted">
            {identity?.summary.email}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-charcoal-muted" aria-hidden />
      </Link>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { resolveActiveProfileId } from "@/lib/context-resolver";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getFamilyIntelligence } from "@/lib/remy/family";
import { computeCoverage } from "@/lib/remy/date-coverage";

import ProfileOverviewCard from "@/components/profile/identity/ProfileOverviewCard";
import ProfileCoverageCard from "@/components/profile/identity/ProfileCoverageCard";
import ProfilePersonSnapshot from "@/components/profile/people/ProfilePersonSnapshot";
import ProfilePersonIntelligence from "@/components/profile/people/ProfilePersonIntelligence";
import ProfileQuickActions from "@/components/profile/people/ProfileQuickActions";

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

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Person profile (/profiles/[id]) — the canonical identity page for one care
 * profile. Access is gated by getAccessibleProfiles (only owned/shared profiles
 * resolve; everything else is notFound). All intelligence is profile-scoped via
 * getFamilyIntelligence (which filters memory_profile_id). No new AI generation.
 */
export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Access guard: only profiles this account can actually see.
  const profiles = await getAccessibleProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (!profile) notFound();

  const name =
    str(profile.preferred_name) ?? str(profile.profile_name) ?? "Care profile";
  const photo = str(profile.profile_photo);
  const relationship = str(profile.relationship_type);
  const age = ageFromDob(str(profile.date_of_birth));

  // Profile-scoped intelligence (filters memory_profile_id internally).
  const [family, firstResult, latestResult, activeProfileId] = await Promise.all([
    getFamilyIntelligence(supabase, [{ id, name }]),
    supabase
      .from("memories")
      .select("created_at")
      .eq("memory_profile_id", id)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("memories")
      .select("created_at")
      .eq("memory_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    resolveActiveProfileId(),
  ]);

  const stat = family.profiles.find((s) => s.id === id);
  const memoryCount = stat?.memoryCount ?? 0;
  const datedCount = stat?.datedCount ?? 0;
  const collectionCount = stat?.collectionCount ?? 0;
  const chapterCount = stat?.chapterCount ?? 0;

  const firstDate = firstResult.data?.[0]?.created_at ?? null;
  const latestDate = latestResult.data?.[0]?.created_at ?? null;
  const coverage = computeCoverage(memoryCount, datedCount);

  return (
    <div className="space-y-4 p-4 md:space-y-5 md:p-6">
      <Link
        href="/profiles"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted transition hover:text-charcoal"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        People
      </Link>

      <ProfileOverviewCard
        name={name}
        photoUrl={photo}
        age={age}
        contextLabel={relationship ? titleCase(relationship) : "Care profile"}
      />

      <ProfilePersonSnapshot
        memories={memoryCount}
        collections={collectionCount}
        chapters={chapterCount}
        dated={datedCount}
      />

      <ProfileCoverageCard
        firstDate={firstDate}
        latestDate={latestDate}
        percentage={coverage.percentage}
        total={coverage.total}
        dated={coverage.dated}
      />

      <ProfilePersonIntelligence
        themes={family.themes}
        observations={family.observations}
      />

      <ProfileQuickActions profileId={id} isActive={activeProfileId === id} />
    </div>
  );
}

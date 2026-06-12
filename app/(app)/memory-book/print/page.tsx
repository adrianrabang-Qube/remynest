import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getActiveContext } from "@/lib/active-profile";
import { getAccessibleProfiles } from "@/lib/profile-access";
import { getDateCoverage } from "@/lib/remy/date-coverage";
import { getRemyLifeChapters } from "@/lib/remy/life-chapters";
import { getRemyCollections } from "@/lib/remy/collections";
import { getRemyConnections } from "@/lib/remy/connections";
import { getFamilyIntelligence } from "@/lib/remy/family";
import { getRemyStories } from "@/lib/remy/story-mode";
import { getRemyBiography } from "@/lib/remy/biography";
import { getRemyMemoryBook } from "@/lib/remy/memory-book";
import { buildExportDocumentFromMemoryBook } from "@/lib/remy/export-document";
import ExportDocumentView from "@/components/remy/ExportDocumentView";
import PrintButton from "@/components/remy/PrintButton";

export const dynamic = "force-dynamic";

export default async function MemoryBookPrintPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Assemble the same narrative intelligence the dashboard uses (read-only).
  const activeContext = await getActiveContext();
  const memoryProfileId =
    activeContext?.type === "CARE" ? activeContext.profileId : null;

  const [chapters, collections, connections, coverage, accessibleProfiles] =
    await Promise.all([
      getRemyLifeChapters(supabase, user.id, { sort: "count", limit: 4 }),
      getRemyCollections(supabase, user.id, {
        limit: 4,
        includeDetails: true,
      }),
      getRemyConnections(supabase, user.id, { limit: 4 }),
      getDateCoverage(supabase, memoryProfileId),
      getAccessibleProfiles(),
    ]);

  const familyProfiles = (accessibleProfiles || []).map((p) => ({
    id: p.id,
    name: p.preferred_name || p.profile_name || "Family member",
  }));
  const family =
    familyProfiles.length >= 2
      ? await getFamilyIntelligence(supabase, familyProfiles)
      : null;

  const stories = getRemyStories({ chapters, collections, connections });
  const biography = getRemyBiography({
    stories,
    chapters,
    collections,
    connections,
    family,
    coverage,
  });
  const book = getRemyMemoryBook({ biography, stories });

  if (!book) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-charcoal">
          Nothing to export yet
        </h1>
        <p className="mt-3 text-charcoal-soft">
          A memory book takes shape as memories are added and dated. Once Remy
          has a story to tell, it will be ready to export here.
        </p>
        <Link
          href="/memory-dates"
          className="mt-6 inline-flex items-center rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
        >
          Add memory dates
        </Link>
      </main>
    );
  }

  const document = buildExportDocumentFromMemoryBook(book);

  return (
    <main className="px-6 py-10">
      {/* Screen-only toolbar (hidden when printing). */}
      <div className="print:hidden mx-auto mb-8 flex max-w-2xl items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-charcoal-muted hover:text-charcoal"
        >
          ← Back to dashboard
        </Link>
        <PrintButton />
      </div>

      <div id="remy-export">
        <ExportDocumentView document={document} />
      </div>
    </main>
  );
}

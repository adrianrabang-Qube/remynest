import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import SafetyCenter from "@/components/moderation/SafetyCenter";
import { listSafetyOverview } from "./actions";
import { REPORT_ACTION_WINDOW_HOURS } from "@/lib/moderation/config";

export const dynamic = "force-dynamic";

/**
 * /settings/safety — the Safety Center (LA5.1, Apple Guideline 1.2). The in-app hub
 * to report or block the people you share care with, and to leave a care workspace.
 * Content (a shared memory) can also be reported from search. Degrades gracefully:
 * if the moderation tables aren't applied yet, mutations return a structured
 * "unavailable" and the page still renders.
 */
export default async function SafetyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = await listSafetyOverview();
  const people = overview.ok ? overview.people : [];
  const leavable = overview.ok ? overview.leavable : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted transition hover:text-charcoal"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Settings
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Safety &amp; reporting
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          RemyNest has zero tolerance for abusive behaviour or objectionable content.
          You can report or block anyone you share care with, and we review reports and
          act on them &mdash; typically within {REPORT_ACTION_WINDOW_HOURS} hours.
          Reports are private.
        </p>
      </header>

      <SafetyCenter initialPeople={people} initialLeavable={leavable} />

      <div className="mt-8 rounded-2xl border border-sand-deep/60 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
          Reporting shared content
        </div>
        <p className="mt-1 text-sm text-charcoal-muted">
          To report a specific memory shared in a care workspace, open Search, find the
          item, and use its Report option. To report a person&apos;s behaviour, use the
          Report button above.
        </p>
      </div>
    </div>
  );
}

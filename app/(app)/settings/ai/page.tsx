import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { resolveAiEntitlement } from "@/lib/ai/usage/entitlements";
import { getAiUsageOverview } from "@/lib/ai/usage/overview";
import AiUsageDashboard from "@/components/remy/AiUsageDashboard";
import AIDisclaimer from "@/components/ai/AIDisclaimer";

export const dynamic = "force-dynamic";

/**
 * /settings/ai — the Remy AI settings section (Phase 27). DISPLAY ONLY: current subscription, AI usage
 * (today/month), estimated cost, provider/model, and remaining quota — all read from `ai_usage`. No editing.
 * Provider-independent (provider/model come from the production provider config). Degrades gracefully.
 */
export default async function AiSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, subscription_status, subscription_plan")
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = resolveAiEntitlement(profile ?? null);
  const overview = await getAiUsageOverview(user.id, entitlement);

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
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">AI &amp; Usage</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Your Remy AI plan, usage, and estimated cost. Display only.
        </p>
      </header>

      <AiUsageDashboard overview={overview} />

      <div className="mt-6 rounded-2xl border border-sand-deep/60 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
          Provider support
        </div>
        <p className="mt-1 text-sm text-charcoal-muted">
          Remy currently runs on {overview.provider}. Support for additional providers is planned and will
          appear here automatically — no change to your experience.
        </p>
      </div>

      <AIDisclaimer kind="general" variant="footnote" />
    </div>
  );
}

import Link from "next/link";

import PricingActions from "@/components/marketing/PricingActions";
import {
  BILLING_PLANS,
  getPlanPriceLabel,
  type PlanConfig,
} from "@/lib/billing/plans";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple RemyNest plans — Free, Premium, and Family — with more space for the photos, videos, and memories that matter.",
  path: "/pricing",
});

// Display order. Values (storage, care profiles, capabilities) are read straight
// from BILLING_PLANS so nothing is duplicated; only the short tagline is copy.
const PLAN_ORDER = ["FREE", "PREMIUM", "FAMILY"] as const;

const TAGLINE: Record<(typeof PLAN_ORDER)[number], string> = {
  FREE: "Start preserving memories, free forever.",
  PREMIUM: "More room for a lifetime of photos and videos.",
  FAMILY: "Share the nest with the people you love.",
};

function featuresFor(cfg: PlanConfig): string[] {
  const features: string[] = [];
  features.push(
    cfg.storageGB === "unlimited"
      ? "Unlimited storage"
      : `${cfg.storageGB} GB of storage`,
  );
  features.push(
    cfg.careProfiles === "unlimited"
      ? "Unlimited care profiles"
      : `${cfg.careProfiles} care profile${cfg.careProfiles === 1 ? "" : "s"}`,
  );
  if (cfg.aiEnabled) features.push("AI-assisted organisation");
  if (cfg.caregiverCollaboration) features.push("Caregiver collaboration");
  return features;
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-[calc(3rem_+_env(safe-area-inset-top))] text-charcoal">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Simple plans for every family
        </h1>
        <p className="mt-3 text-charcoal-soft">
          Keep your memories in a calm, private home. Upgrade any time for more
          space — your memories always stay yours.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const cfg = BILLING_PLANS[plan];
          const price = getPlanPriceLabel(plan); // "" for FREE
          const featured = plan === "PREMIUM";
          return (
            <section
              key={plan}
              className={`flex flex-col rounded-3xl border p-6 shadow-soft ${
                featured
                  ? "border-sage bg-white ring-1 ring-sage/30"
                  : "border-sand-deep bg-white"
              }`}
            >
              {featured && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sage">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-semibold">{cfg.displayName}</h2>
              <p className="mt-1 text-sm text-charcoal-soft">{TAGLINE[plan]}</p>
              <p className="mt-4 text-3xl font-semibold">
                {price || "Free"}
                {price && (
                  <span className="text-base font-normal text-charcoal-muted">
                    {" "}
                    / month
                  </span>
                )}
              </p>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-charcoal">
                {featuresFor(cfg).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <PricingActions plan={plan} />
              </div>
            </section>
          );
        })}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-charcoal-muted">
        Prices in EUR, billed monthly, cancel any time. Storage is shared across
        all your memories and care profiles. Need an organisation plan?{" "}
        <Link href="/contact" className="font-medium text-sage underline">
          Talk to us
        </Link>
        .
      </p>
    </main>
  );
}

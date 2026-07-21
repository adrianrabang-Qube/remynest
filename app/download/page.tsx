import Link from "next/link";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Download",
  description: "Get RemyNest on iPhone, or use it right in your browser.",
  path: "/download",
});

// Store URL isn't live yet — wire this env var at submission time; until then the
// iPhone card shows a neutral "Coming soon" state (no dead link). Android is not
// shipped (no signing/FCM — a decided post-iOS deferral) and is intentionally not
// offered here; iPad is not supported in the v1 release (iPhone-only target).
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";

function StoreCard({
  platform,
  blurb,
  href,
  cta,
  comingSoon,
}: {
  platform: string;
  blurb: string;
  href: string;
  cta: string;
  comingSoon?: boolean;
}) {
  return (
    <section className="flex flex-col rounded-3xl border border-sand-deep bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-charcoal">{platform}</h2>
      <p className="mt-2 flex-1 text-sm text-charcoal-soft">{blurb}</p>
      {comingSoon ? (
        <span className="mt-5 inline-flex w-fit rounded-xl bg-sand px-4 py-2.5 text-sm font-medium text-charcoal-muted">
          Coming soon
        </span>
      ) : href.startsWith("/") ? (
        <Link
          href={href}
          className="mt-5 inline-flex w-fit rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep"
        >
          {cta}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-fit rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep"
        >
          {cta}
        </a>
      )}
    </section>
  );
}

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-[calc(3rem_+_env(safe-area-inset-top))] text-charcoal">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Get RemyNest</h1>
        <p className="mt-3 text-charcoal-soft">
          A calm home for your memories — on your iPhone, or right in your
          browser.
        </p>
      </header>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <StoreCard
          platform="iPhone"
          blurb="Download RemyNest from the App Store for the full native experience, including on-device reminders."
          href={APP_STORE_URL}
          cta="Download on the App Store"
          comingSoon={!APP_STORE_URL}
        />
        <StoreCard
          platform="Web app"
          blurb="Prefer your browser? RemyNest works on any modern desktop or mobile browser — nothing to install."
          href="/login"
          cta="Open the web app"
        />
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-charcoal-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Sign in
        </Link>{" "}
        · New here?{" "}
        <Link href="/pricing" className="font-medium text-primary underline">
          See plans
        </Link>
      </p>
    </main>
  );
}

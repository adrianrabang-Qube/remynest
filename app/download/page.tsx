import Link from "next/link";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Download",
  description:
    "Get RemyNest on iPhone and iPad, on Android, or use it right in your browser.",
  path: "/download",
});

// Store URLs aren't live yet — wire these env vars at submission time; until then
// each section shows a neutral "Coming soon" state (no dead links).
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "";

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
          className="mt-5 inline-flex w-fit rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-deep"
        >
          {cta}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-fit rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-deep"
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
          A calm home for your memories — on your phone, your tablet, or right in
          your browser.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <StoreCard
          platform="iPhone & iPad"
          blurb="Download RemyNest from the App Store for the full native experience, including on-device reminders."
          href={APP_STORE_URL}
          cta="Download on the App Store"
          comingSoon={!APP_STORE_URL}
        />
        <StoreCard
          platform="Android"
          blurb="Get RemyNest on Google Play for your Android phone or tablet."
          href={PLAY_STORE_URL}
          cta="Get it on Google Play"
          comingSoon={!PLAY_STORE_URL}
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
        <Link href="/login" className="font-medium text-sage underline">
          Sign in
        </Link>{" "}
        · New here?{" "}
        <Link href="/pricing" className="font-medium text-sage underline">
          See plans
        </Link>
      </p>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Download,
  Heart,
  Lock,
  Mic,
  Puzzle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

/**
 * The public marketing landing page (2026-07-20 modernization).
 *
 * SERVER-RENDERED: no "use client", no hooks, no motion libraries — the page is
 * static, mobile-first markup styled with the brand tokens (sand/charcoal chrome)
 * and the canonical purple RemyNest identity (`/brand/remynest-mark.png` +
 * violet #5B3E8E accents, the same treatment as `RemyNestLogo`). The filename is
 * kept for scope continuity; it is no longer a client component.
 *
 * CONTENT RULES (authoritative — LA5/brand guardrails): every claim below is a
 * source-verified shipped capability or a product promise; no fictional users,
 * testimonials, metrics, medication examples, Android/iPad claims, or clinical
 * language. The App Store CTA appears ONLY when NEXT_PUBLIC_APP_STORE_URL is
 * configured (read at render time on the server).
 */

const VIOLET = "#5B3E8E";

function Wordmark({ markSize = 36 }: { markSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/brand/remynest-mark.png"
        alt=""
        aria-hidden
        width={Math.round(markSize * (695 / 728))}
        height={markSize}
        priority
        draggable={false}
      />
      <span className="font-serif text-xl font-semibold tracking-tight">
        <span className="text-charcoal">Remy</span>
        <span style={{ color: VIOLET }}>Nest</span>
      </span>
    </span>
  );
}

const PROMISES = [
  {
    Icon: Camera,
    title: "Preserve important moments",
    body: "Photos, videos, voice recordings and written notes — kept together as memories, not scattered across devices.",
  },
  {
    Icon: Search,
    title: "Organise and revisit",
    body: "A timeline of your story, search that understands what you mean, and galleries that bring a moment back.",
  },
  {
    Icon: Users,
    title: "Stay connected with family",
    body: "Invite the people who matter into a shared nest, and choose exactly what each person can see and do.",
  },
  {
    Icon: Lock,
    title: "Private by design",
    body: "Your memories belong to you and the people you invite — and you can export or delete your data at any time.",
  },
];

const JOURNEYS = [
  {
    step: "1",
    title: "Capture a moment",
    body: "Add a photo, record a voice note, or simply write it down — a memory takes less than a minute to keep.",
  },
  {
    step: "2",
    title: "Find and revisit it",
    body: "Browse your timeline, search for a person or a feeling, and let old moments resurface when you need them.",
  },
  {
    step: "3",
    title: "Share with the right people",
    body: "Bring family and trusted helpers into the nest, with access you control — and can change any time.",
  },
];

const FEATURE_GROUPS = [
  {
    Icon: Camera,
    title: "Preserve",
    items: ["Photo memories with full galleries", "Video moments", "Voice memories in your own words", "Written notes and stories"],
  },
  {
    Icon: BookOpen,
    title: "Revisit",
    items: ["A timeline of your story", "Search across everything you've kept", "Stories built from your own memories", "Gentle look-backs, one moment at a time"],
  },
  {
    Icon: Users,
    title: "Together",
    items: ["Shared family workspaces", "Invite helpers with view-only or full access", "You stay in control of who sees what"],
  },
  {
    Icon: Puzzle,
    title: "Enjoy",
    items: [
      "Memory Puzzles from your own photos",
      "Memory Match, a gentle game with your own photos",
      "Story Builder, for putting moments in order",
      "Music Memories — the songs of your life",
      "Together Time, our family activity for looking back side by side",
    ],
  },
  {
    Icon: Sparkles,
    title: "Support",
    items: ["Gentle reminders that respect your day", "Remy, a warm companion who helps you find and revisit memories"],
  },
  {
    Icon: Lock,
    title: "Your data, your rules",
    items: ["Memories are private to your nest", "Export everything whenever you like", "Delete your account and data yourself"],
  },
];

export default function LandingClient() {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";

  return (
    <div className="bg-sand text-charcoal">
      {/* HEADER */}
      <header className="border-b border-sand-deep/60 bg-sand/90 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Wordmark />
          <nav aria-label="Site" className="hidden items-center gap-7 text-[17px] text-charcoal-soft md:flex">
            <a href="#features" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Features
            </a>
            <a href="#privacy" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Privacy
            </a>
            <Link href="/pricing" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-[17px] font-medium text-charcoal-soft transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              style={{ backgroundColor: VIOLET }}
              className="inline-flex min-h-11 items-center rounded-full px-5 text-[17px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* HERO */}
        <section aria-labelledby="hero-title" className="px-5 pb-14 pt-12 md:pb-20 md:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <h1 id="hero-title" className="font-serif text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
                A private home for your family&rsquo;s memories
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-charcoal-soft">
                RemyNest is a calm place to preserve photos, voices, stories and
                moments together — organised gently, shared only with the people
                you choose, and there whenever you want to remember.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  style={{ backgroundColor: VIOLET }}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-lg font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
                >
                  Create your free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-charcoal/15 bg-white px-7 text-lg font-medium text-charcoal transition hover:bg-sand-deep/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-[17px] text-charcoal-muted">
                Works in your browser today — nothing to install.
              </p>
            </div>

            {/* BRAND-NATIVE PRODUCT VISUAL — calm, abstract memory motifs (no
                fictional users, no invented UI, no unsupported claims). */}
            <div aria-hidden className="relative mx-auto w-full max-w-md">
              <div
                className="absolute inset-0 -z-10 rounded-[3rem] opacity-[0.07]"
                style={{ background: `radial-gradient(circle at 50% 35%, ${VIOLET}, transparent 70%)` }}
              />
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-3xl border border-sand-deep/60 bg-white p-5 shadow-soft">
                  <Image
                    src="/brand/remynest-mark.png"
                    alt=""
                    width={53}
                    height={56}
                    draggable={false}
                  />
                  <div>
                    <p className="font-serif text-lg font-semibold text-charcoal">Your nest</p>
                    <p className="text-[17px] text-charcoal-muted">Every memory, safely home</p>
                  </div>
                </div>
                <div className="ml-6 rounded-3xl border border-sand-deep/60 bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#8A6BD01A", color: VIOLET }}>
                      <Camera className="h-5 w-5" />
                    </span>
                    <p className="font-medium text-charcoal">A morning by the sea</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-14 rounded-xl bg-gradient-to-br from-[#8A6BD0]/25 to-[#5B3E8E]/40" />
                    <div className="h-14 rounded-xl bg-gradient-to-br from-gold-soft to-gold/60" />
                    <div className="h-14 rounded-xl bg-gradient-to-br from-sand-deep to-sage/30" />
                  </div>
                </div>
                <div className="rounded-3xl border border-sand-deep/60 bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#8A6BD01A", color: VIOLET }}>
                      <Mic className="h-5 w-5" />
                    </span>
                    <p className="font-medium text-charcoal">A story in your own voice</p>
                  </div>
                  <div className="mt-4 flex h-8 items-end gap-1" aria-hidden>
                    {[10, 18, 26, 14, 30, 22, 12, 26, 18, 8, 22, 30, 16, 10, 24, 14].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full"
                        style={{ height: `${h}px`, backgroundColor: i % 3 === 0 ? "#C9A86A" : "#8A6BD0", opacity: 0.7 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT PROMISE */}
        <section aria-labelledby="promise-title" className="bg-white px-5 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 id="promise-title" className="font-serif text-3xl font-semibold text-charcoal md:text-4xl">
              Made to hold what matters
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PROMISES.map(({ Icon, title, body }) => (
                <div key={title} className="rounded-3xl border border-sand-deep/60 bg-sand p-6">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#8A6BD01A", color: VIOLET }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-semibold text-charcoal">{title}</h3>
                  <p className="mt-2 text-[17px] leading-relaxed text-charcoal-soft">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CORE JOURNEYS */}
        <section aria-labelledby="journeys-title" className="px-5 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 id="journeys-title" className="font-serif text-3xl font-semibold text-charcoal md:text-4xl">
              How a memory finds its home
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {JOURNEYS.map(({ step, title, body }) => (
                <div key={step} className="rounded-3xl border border-sand-deep/60 bg-white p-7 shadow-soft">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg font-semibold text-white"
                    style={{ backgroundColor: VIOLET }}
                    aria-hidden
                  >
                    {step}
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-semibold text-charcoal">{title}</h3>
                  <p className="mt-2 text-[17px] leading-relaxed text-charcoal-soft">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE GROUPS */}
        <section id="features" aria-labelledby="features-title" className="bg-white px-5 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 id="features-title" className="font-serif text-3xl font-semibold text-charcoal md:text-4xl">
              Everything a family nest needs
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-charcoal-soft">
              Every feature below is in RemyNest today.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_GROUPS.map(({ Icon, title, items }) => (
                <div key={title} className="rounded-3xl border border-sand-deep/60 bg-sand p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#8A6BD01A", color: VIOLET }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="font-serif text-xl font-semibold text-charcoal">{title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[17px] leading-relaxed text-charcoal-soft">
                        <Heart className="mt-1.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRIVACY & TRUST */}
        <section id="privacy" aria-labelledby="privacy-title" className="px-5 py-14 md:py-20">
          <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-sand-deep/60 bg-white p-8 shadow-soft md:p-12">
            <div className="flex items-start gap-4">
              <span
                className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full sm:flex"
                style={{ backgroundColor: "#8A6BD01A", color: VIOLET }}
              >
                <Lock className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 id="privacy-title" className="font-serif text-3xl font-semibold text-charcoal md:text-4xl">
                  Private by design
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-charcoal-soft">
                  Your memories are yours. They are visible only to you and the
                  people you invite into your nest, you decide what each person
                  can see and do, and you can export your data — or delete your
                  account and everything in it — whenever you choose.
                </p>
                <p className="mt-4 text-[17px] text-charcoal-muted">
                  Read more in our{" "}
                  <Link href="/privacy" className="rounded font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" style={{ color: VIOLET }}>
                    privacy policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className="rounded font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" style={{ color: VIOLET }}>
                    terms
                  </Link>
                  , or visit{" "}
                  <Link href="/account-deletion" className="rounded font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" style={{ color: VIOLET }}>
                    account deletion
                  </Link>{" "}
                  and{" "}
                  <Link href="/support" className="rounded font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" style={{ color: VIOLET }}>
                    support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AVAILABILITY */}
        <section aria-labelledby="availability-title" className="bg-white px-5 py-14 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 id="availability-title" className="font-serif text-3xl font-semibold text-charcoal md:text-4xl">
              Where you can use RemyNest
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-charcoal-soft">
              RemyNest works in any modern browser today, on your phone or your
              computer — nothing to install.
              {appStoreUrl
                ? " The iPhone app is available on the App Store."
                : " The iPhone app is on its way to the App Store."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                style={{ backgroundColor: VIOLET }}
                className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-lg font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              >
                Open RemyNest in your browser
              </Link>
              {appStoreUrl ? (
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-charcoal/15 bg-white px-7 text-lg font-medium text-charcoal transition hover:bg-sand-deep/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  <Download className="h-5 w-5" aria-hidden />
                  Download on the App Store
                </a>
              ) : (
                <Link
                  href="/download"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-charcoal/15 bg-white px-7 text-lg font-medium text-charcoal transition hover:bg-sand-deep/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  See platform details
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section aria-labelledby="cta-title" className="px-5 pb-20 pt-14">
          <div
            className="mx-auto max-w-4xl rounded-[2.5rem] p-10 text-center md:p-14"
            style={{ background: `linear-gradient(135deg, ${VIOLET}, #3A2266)` }}
          >
            <h2 id="cta-title" className="font-serif text-3xl font-semibold text-white md:text-4xl">
              Start your family&rsquo;s nest today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
              The moments you keep now are the stories your family will return
              to for years.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-lg font-semibold transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                style={{ color: VIOLET }}
              >
                Create your free account
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-7 text-lg font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-sand-deep/60 bg-sand px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Wordmark markSize={30} />
            <p className="mt-2 text-[17px] text-charcoal-muted">A safe place for memories.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[17px] text-charcoal-soft">
            <Link href="/privacy" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Privacy
            </Link>
            <Link href="/terms" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Terms
            </Link>
            <Link href="/support" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Support
            </Link>
            <Link href="/contact" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Contact
            </Link>
            <Link href="/pricing" className="rounded transition hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              Pricing
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

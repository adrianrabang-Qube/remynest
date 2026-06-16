import Link from "next/link";

import { CONTACT } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Contact RemyNest about Enterprise solutions, partnerships, and investment opportunities.",
  path: "/contact",
});

const ENTERPRISE_FOR = [
  "Care Homes",
  "Assisted Living Facilities",
  "Healthcare Providers",
  "Memory Clinics",
  "Dementia Organizations",
  "Healthcare Networks",
];

const ENTERPRISE_FEATURES = [
  "Multi-user access",
  "Administrative controls",
  "Organization onboarding",
  "Compliance support",
  "Custom deployment options",
  "Custom pricing",
];

/**
 * Public Contact page. Enterprise/Investor pathway only — no billing, checkout,
 * or subscription tier here. Contact addresses come from `lib/contact.ts`.
 */
export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-12 pt-[calc(3rem_+_env(safe-area-inset-top))] text-neutral-800">
      <h1 className="text-3xl font-semibold">Contact RemyNest</h1>
      <p className="mt-3 text-neutral-600">
        We&apos;d love to hear from organizations, partners, and investors who
        share our mission of preserving memories and supporting cognitive care.
      </p>

      {/* General Contact */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">General Contact</h2>
        <p className="mt-2 text-neutral-700">
          For general questions or support, reach us at{" "}
          <a
            href={`mailto:${CONTACT.general}`}
            className="font-medium text-blue-600 underline underline-offset-2"
          >
            {CONTACT.general}
          </a>
          .
        </p>
      </section>

      {/* Enterprise Solutions */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Enterprise Solutions</h2>

        <p className="mt-2 text-neutral-700">Designed for:</p>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ENTERPRISE_FOR.map((item) => (
            <li key={item} className="flex items-center gap-2 text-neutral-700">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-neutral-700">Features:</p>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ENTERPRISE_FEATURES.map((item) => (
            <li key={item} className="flex items-center gap-2 text-neutral-700">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl border bg-neutral-50 p-5">
          <p className="font-medium">Contact us to discuss Enterprise solutions.</p>
          <a
            href={`mailto:${CONTACT.enterprise}`}
            className="mt-2 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {CONTACT.enterprise}
          </a>
        </div>
      </section>

      {/* Investors & Partnerships */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Investors &amp; Partnerships</h2>
        <p className="mt-2 text-neutral-700">
          Interested in partnerships, strategic collaborations, healthcare
          initiatives, or investment opportunities?
        </p>
        <p className="mt-3 text-neutral-700">
          Contact:{" "}
          <a
            href={`mailto:${CONTACT.investors}`}
            className="font-medium text-blue-600 underline underline-offset-2"
          >
            {CONTACT.investors}
          </a>
        </p>
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        Looking for product help instead? See our{" "}
        <Link className="text-blue-600" href="/privacy">
          Privacy Policy
        </Link>{" "}
        or account options in Settings.
      </p>
    </main>
  );
}

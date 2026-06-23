import Link from "next/link";

import { CONTACT } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Support",
  description:
    "Get help with your RemyNest account, billing, privacy, and data requests.",
  path: "/support",
});

// Copy aligned with docs/compliance/04-support-page-content.md. Avoids medical claims.

const Mail = ({ to }: { to: string }) => (
  <a
    href={`mailto:${to}`}
    className="font-medium text-sage underline underline-offset-2"
  >
    {to}
  </a>
);

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-16 pt-[calc(3rem_+_env(safe-area-inset-top))] text-charcoal">
      <h1 className="text-3xl font-semibold">We&apos;re here to help</h1>
      <p className="mt-3 text-charcoal-soft">
        Whether you have a question about your account, billing, privacy, or how
        a feature works, our team is happy to help. We aim to respond within{" "}
        <strong>1–2 business days</strong>.
      </p>

      {/* Support contact */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Support contact</h2>
        <p className="mt-2 text-charcoal">
          General &amp; technical support: <Mail to={CONTACT.support} />.
        </p>
        <p className="mt-3 text-sm text-charcoal-soft">
          Before you reach out: you can manage your subscription, export your
          data, and delete your account directly in the app under{" "}
          <strong>Profile → Settings → Privacy</strong>, or from your{" "}
          <Link href="/account/subscription" className="text-sage underline">
            subscription page
          </Link>
          .
        </p>
      </section>

      {/* Privacy requests */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Privacy &amp; data requests</h2>
        <p className="mt-2 text-charcoal">
          For access, correction, portability, or other data-rights requests:{" "}
          <Mail to={CONTACT.privacy} />. Our Data Protection Officer can be
          reached at <Mail to={CONTACT.dpo} />.
        </p>
        <p className="mt-3 text-sm text-charcoal-soft">
          Privacy and data-rights requests are handled within the timeframes
          required by law (generally within one month). See our{" "}
          <Link href="/privacy" className="text-sage underline">
            Privacy Policy
          </Link>{" "}
          for details on the data we hold and your rights.
        </p>
      </section>

      {/* Data deletion */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Data deletion requests</h2>
        <p className="mt-2 text-charcoal">
          You can permanently delete your account and associated data yourself —
          in the app under <strong>Settings → Privacy</strong>, or via our{" "}
          <Link href="/account-deletion" className="text-sage underline">
            account deletion page
          </Link>
          . Prefer we handle it? Email <Mail to={CONTACT.privacy} /> and we will
          process your request.
        </p>
      </section>

      {/* Security */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Reporting a security issue</h2>
        <p className="mt-2 text-charcoal">
          Found a vulnerability? Please report it responsibly to{" "}
          <Mail to={CONTACT.security} />.
        </p>
      </section>

      <p className="mt-10 text-sm text-charcoal-muted">
        RemyNest helps individuals, families and caregivers preserve and organise
        memories. It is not a medical device and does not provide medical advice.
      </p>
    </main>
  );
}

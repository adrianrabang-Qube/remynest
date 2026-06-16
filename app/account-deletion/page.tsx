import Link from "next/link";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Account & Data Deletion",
  description:
    "How to delete your RemyNest account and what happens to your data.",
  path: "/account-deletion",
});

/**
 * Public account-deletion information page (Apple 5.1.1(v) / Google Play
 * account-deletion requirement). Reachable without signing in.
 */
export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-12 pt-[calc(3rem_+_env(safe-area-inset-top))] text-neutral-800">
      <h1 className="text-3xl font-semibold">Delete your RemyNest account</h1>
      <p className="mt-3 text-neutral-600">
        You can permanently delete your RemyNest account and personal data at any
        time. This page explains how, and exactly what happens to your data.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">How to delete your account</h2>
        <ol className="mt-2 list-decimal pl-6 text-neutral-700">
          <li>Open RemyNest and sign in.</li>
          <li>
            Go to <strong>Settings → Danger Zone → Delete Account</strong>.
          </li>
          <li>
            Review the summary, confirm, re-authenticate, type{" "}
            <span className="font-mono">DELETE</span>, and confirm.
          </li>
        </ol>
        <p className="mt-3 text-neutral-600">
          If you cannot access the app, email{" "}
          <a className="text-blue-600" href="mailto:privacy@remynest.com">
            privacy@remynest.com
          </a>{" "}
          from your registered address and we will action your request.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What gets deleted</h2>
        <ul className="mt-2 list-disc pl-6 text-neutral-700">
          <li>Your account and profile</li>
          <li>Your memories, notes, reminders and memory clusters</li>
          <li>Care profiles you solely own, and their contents</li>
          <li>Your uploaded photos and videos</li>
          <li>Your device registrations and notification tokens</li>
          <li>Your caregiver relationships and invitations</li>
          <li>Your authentication identity (login)</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Shared care profiles</h2>
        <p className="mt-2 text-neutral-700">
          If you own a care profile that other accepted caregivers also use,
          ownership is <strong>transferred</strong> to another caregiver so the
          shared care record is preserved for everyone who relies on it. If no
          other caregiver exists, the profile is deleted with your account.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">
          Memories you contributed to other people&apos;s profiles
        </h2>
        <p className="mt-2 text-neutral-700">
          By default, memories you added to <em>someone else&apos;s</em> care
          profile are <strong>retained</strong> as part of that person&apos;s
          record, with your authorship <strong>anonymised</strong> (shown as a
          deleted contributor). We never re-attribute your entries to another
          real person. You may instead choose to{" "}
          <strong>permanently delete</strong> those contributed memories during
          the deletion flow.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Timing &amp; backups</h2>
        <p className="mt-2 text-neutral-700">
          Deletion from live systems is immediate. Residual encrypted backups age
          out within 30 days. Limited records may be retained where required by
          law (for example, billing/tax records).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="mt-2 text-neutral-700">
          Privacy:{" "}
          <a className="text-blue-600" href="mailto:privacy@remynest.com">
            privacy@remynest.com
          </a>{" "}
          · See our{" "}
          <Link className="text-blue-600" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

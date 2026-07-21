"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { inviteCaregiver } from "@/app/(app)/dashboard/actions";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { useIsNativePlatform } from "@/lib/platform";
import { useStorageUsage } from "@/components/storage/useStorageUsage";

interface InviteCaregiverFormProps {
  memoryProfileId: string;
}

export default function InviteCaregiverForm({
  memoryProfileId,
}: InviteCaregiverFormProps) {
  const { data: usage } = useStorageUsage();
  const native = useIsNativePlatform();

  // ENTITLEMENT GATE — checked BEFORE the form renders. Caregiver collaboration is a
  // Family-plan feature; never show a fully-enabled invite form to a user who can't
  // use it (Apple 2.1 completeness) and never let them reach a submit dead-end.
  // Default-closed while usage is loading.
  const hasAccess =
    usage != null &&
    BILLING_PLANS[usage.tier]?.caregiverCollaboration === true;

  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] = useState("family");
  const [accessLevel, setAccessLevel] = useState("full");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!hasAccess) {
    // Native (Apple 3.1.1/3.1.3): informational only — no purchase UI, no external
    // link, no "subscribe on the web" steering. Web: an in-app upgrade path.
    return (
      <div className="mt-4 rounded-xl border border-sand-deep/60 bg-white p-4">
        <h3 className="font-semibold text-charcoal">Caregiver Collaboration</h3>
        <p className="mt-1 text-sm text-charcoal-soft">
          Invite family members and caregivers to collaborate inside a shared care
          space.
        </p>
        {native ? (
          <p className="mt-2 text-xs text-charcoal-muted">
            Available on the Family plan.
          </p>
        ) : (
          <Link
            href="/account/subscription"
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep"
          >
            See plans
          </Link>
        )}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      try {
        const result = await inviteCaregiver({
          email,
          relationshipType,
          accessLevel,
          memoryProfileId,
        });

        // Defensive only — the pre-gate above means entitled users reach this. If the
        // server still reports an entitlement gap, show a neutral message (no modal,
        // no native dead-end).
        if (
          result &&
          "code" in result &&
          result.code === "UPGRADE_REQUIRED"
        ) {
          setMessage(
            "Caregiver collaboration is available on the Family plan."
          );
          return;
        }

        if ("error" in result) {
          setMessage(result.error);
          return;
        }

        setMessage("✅ Invite sent successfully");
        setEmail("");
      } catch (err) {
        console.error(err);
        setMessage("❌ Failed to send invite");
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border p-4 bg-gray-50">
      <h3 className="font-semibold mb-4">Invite Access</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          aria-label="Email address"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          required
        />

        <select
          aria-label="Relationship"
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
        >
          <option value="family">Family</option>
          <option value="caregiver">Caregiver</option>
          <option value="doctor">Doctor</option>
          <option value="friend">Friend</option>
          <option value="support_worker">Support Worker</option>
          <option value="case_manager">Case Manager</option>
          <option value="emergency_contact">Emergency Contact</option>
          <option value="other">Other</option>
        </select>

        <label className="block text-sm font-medium text-charcoal">
          What can they do?
          <select
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="mt-1 w-full rounded-lg border px-4 py-2 font-normal"
          >
            <option value="read">Read-only — can view</option>
            <option value="full">Full access — can view, add &amp; edit</option>
            <option value="admin">Admin — same as full access</option>
          </select>
        </label>
        {/* LA1: least-privilege clarity — 'admin' currently confers the same rights as
            'full' (only 'read' restricts writes; inviting/removing people is owner-only).
            Copy/label only — no permission-logic change. */}
        <p className="text-xs text-charcoal-muted">
          <strong>Read-only</strong> can view memories &amp; reminders.{" "}
          <strong>Full access</strong> can also add and edit them. Only you, the
          profile owner, can invite or remove people — pick Read-only to share
          viewing without giving edit access to private memories.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary text-white px-4 py-2 transition hover:bg-primary-deep disabled:opacity-60"
        >
          {isPending ? "Inviting..." : "Send Invite"}
        </button>

        {message && (
          <p role="status" aria-live="polite" className="text-sm text-charcoal">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

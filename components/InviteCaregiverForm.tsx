"use client";

import { useState, useTransition } from "react";
import { inviteCaregiver } from "@/app/(app)/dashboard/actions";
import type { BillingPlan } from "@/lib/billing/plans";
import UpgradeModal from "@/components/UpgradeModal";

interface InviteCaregiverFormProps {
  memoryProfileId: string;
}

export default function InviteCaregiverForm({
  memoryProfileId,
}: InviteCaregiverFormProps) {
  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] =
    useState("family");

  const [accessLevel, setAccessLevel] =
    useState("full");

  const [message, setMessage] = useState("");

  const [showUpgrade, setShowUpgrade] =
    useState(false);
  const [upgradePlan, setUpgradePlan] =
    useState<BillingPlan>("FREE");

  const [isPending, startTransition] =
    useTransition();

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    startTransition(async () => {
      try {
        const result =
          await inviteCaregiver({
            email,
            relationshipType,
            accessLevel,
            memoryProfileId,
          });

        // Entitlement gate — open the upgrade flow instead of showing an error.
        if (
          result &&
          "code" in result &&
          result.code === "UPGRADE_REQUIRED"
        ) {
          setUpgradePlan(result.plan);
          setShowUpgrade(true);
          return;
        }

        if ("error" in result) {
          setMessage(result.error);
          return;
        }

        setMessage(
          "✅ Invite sent successfully"
        );

        setEmail("");
      } catch (err) {
        console.error(err);

        setMessage(
          "❌ Failed to send invite"
        );
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border p-4 bg-gray-50">
      <h3 className="font-semibold mb-4">
        Invite Access
      </h3>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full rounded-lg border px-4 py-2"
          required
        />

        <select
          value={relationshipType}
          onChange={(e) =>
            setRelationshipType(
              e.target.value
            )
          }
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="family">
            Family
          </option>

          <option value="caregiver">
            Caregiver
          </option>

          <option value="doctor">
            Doctor
          </option>

          <option value="friend">
            Friend
          </option>

          <option value="support_worker">
            Support Worker
          </option>

          <option value="case_manager">
            Case Manager
          </option>

          <option value="emergency_contact">
            Emergency Contact
          </option>

          <option value="other">
            Other
          </option>
        </select>

        <select
          value={accessLevel}
          onChange={(e) =>
            setAccessLevel(e.target.value)
          }
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="read">
            Read Only
          </option>

          <option value="full">
            Full Access
          </option>

          <option value="admin">
            Admin
          </option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black text-white px-4 py-2"
        >
          {isPending
            ? "Inviting..."
            : "Send Invite"}
        </button>

        {message && (
          <p className="text-sm text-gray-700">
            {message}
          </p>
        )}
      </form>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={upgradePlan}
        reason="caregiver-collaboration"
        requiredFeature="caregiverCollaboration"
      />
    </div>
  );
}
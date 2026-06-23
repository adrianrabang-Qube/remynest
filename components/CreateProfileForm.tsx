"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createProfile } from "@/app/(app)/dashboard/actions";
import type { BillingPlan } from "@/lib/billing/plans";
import UpgradeModal from "./UpgradeModal";
import { useToast } from "@/components/ToastProvider";

interface LimitInfo {
  plan: BillingPlan;
  limit: number;
  currentCount: number;
}

export default function CreateProfileForm({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const { showToast } = useToast();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      const result = await createProfile(formData);

      if (result.ok) {
        showToast("Person added");
        // Soft refresh + let the parent close the drawer/modal — no full-page reload.
        router.refresh();
        onSuccess?.();
        return;
      }

      switch (result.code) {
        case "CARE_PROFILE_LIMIT_REACHED":
          // Expected business rule → convert to upgrade flow, not an error.
          setLimitInfo({
            plan: result.plan,
            limit: result.limit,
            currentCount: result.currentCount,
          });
          break;
        case "VALIDATION":
          setError(result.message);
          break;
        default:
          setError(result.message);
      }
    } catch {
      // Only genuinely unexpected failures reach here (e.g. network).
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">Add a person</h2>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Their name
          </label>
          <input
            type="text"
            name="profile_name"
            required
            placeholder="Grandma Mary"
            className="w-full border rounded-xl p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Preferred Name
          </label>
          <input
            type="text"
            name="preferred_name"
            placeholder="Mary"
            className="w-full border rounded-xl p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            name="date_of_birth"
            className="w-full border rounded-xl p-3"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-sage text-white px-6 py-3 rounded-xl transition hover:bg-sage-deep disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Person"}
        </button>
      </form>

      <UpgradeModal
        open={limitInfo !== null}
        onClose={() => setLimitInfo(null)}
        currentPlan={limitInfo?.plan}
        limit={limitInfo?.limit}
        currentCount={limitInfo?.currentCount}
        reason="care-profile-limit"
      />
    </div>
  );
}

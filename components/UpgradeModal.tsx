"use client";

import { useState } from "react";
import type { BillingPlan } from "@/lib/billing/plans";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({
  open,
  onClose,
}: UpgradeModalProps) {
  const [loading, setLoading] =
    useState(false);

  const [selectedPlan, setSelectedPlan] =
    useState<BillingPlan>("PREMIUM");

  if (!open) return null;

  async function handleUpgrade() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/stripe/checkout",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              plan: selectedPlan,
              interval: "monthly",
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Checkout failed"
        );
      }

      window.location.href =
        data.url;
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Checkout failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">

        <h2 className="text-2xl font-bold mb-4">
          Free Plan Limit Reached
        </h2>

        <p className="text-gray-600 mb-6">
          You’ve reached your current
          care profile limit.
        </p>

        <div className="space-y-4 mb-8">

          <div
            onClick={() =>
              setSelectedPlan("PREMIUM")
            }
            className={`border rounded-2xl p-4 cursor-pointer transition ${
              selectedPlan === "PREMIUM"
                ? "border-black bg-gray-100"
                : "border-gray-200"
            }`}
          >
            <h3 className="font-semibold">
              Premium
            </h3>

            <p className="text-sm text-gray-500">
              Up to 3 care profiles · €9.99/month
            </p>
          </div>

          <div
            onClick={() =>
              setSelectedPlan("FAMILY")
            }
            className={`border rounded-2xl p-4 cursor-pointer transition ${
              selectedPlan === "FAMILY"
                ? "border-black bg-gray-100"
                : "border-gray-200"
            }`}
          >
            <h3 className="font-semibold">
              Family
            </h3>

            <p className="text-sm text-gray-500">
              Up to 5 care profiles · Family plan
            </p>
          </div>

        </div>

        <div className="flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 border rounded-xl py-3"
          >
            Maybe Later
          </button>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 bg-black text-white rounded-xl py-3 disabled:opacity-50"
          >
            {loading
              ? "Redirecting..."
              : `Upgrade to ${selectedPlan}`}
          </button>

        </div>

      </div>
    </div>
  );
}
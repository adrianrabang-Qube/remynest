"use client";

import { useState } from "react";

export default function UpgradeButton() {
  const [selectedPlan, setSelectedPlan] = useState<"PREMIUM" | "FAMILY">("PREMIUM");
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: selectedPlan,
          interval: "monthly",
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSelectedPlan("PREMIUM")}
          className={`px-4 py-2 rounded-xl border ${
            selectedPlan === "PREMIUM"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-300"
          }`}
        >
          Premium (€9.99/mo)
        </button>

        <button
          type="button"
          onClick={() => setSelectedPlan("FAMILY")}
          className={`px-4 py-2 rounded-xl border ${
            selectedPlan === "FAMILY"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-300"
          }`}
        >
          Family
        </button>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded-xl disabled:opacity-50"
      >
        {loading
          ? "Redirecting..."
          : `Upgrade to ${selectedPlan}`}
      </button>
    </div>
  );
}
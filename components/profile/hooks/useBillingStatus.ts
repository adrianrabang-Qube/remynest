"use client";

import { useEffect, useState } from "react";

interface BillingStatus {
  plan: string;
  status: string;
  renewalDate: string | null;
  customerPortalEnabled: boolean;
  trial: boolean;
  cancelAtPeriodEnd: boolean;
}

export function useBillingStatus() {
  const [billing, setBilling] =
    useState<BillingStatus | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/billing/status",
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load billing status.",
          );
        }

        setBilling(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Billing status failed.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    billing,
    loading,
    error,
  };
}
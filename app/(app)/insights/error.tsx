"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };

  reset: () => void;
}

export default function InsightsErrorPage({
  error,
  reset,
}: ErrorPageProps) {

  useEffect(() => {
    console.error(
      "Insights dashboard error:",
      error
    );
    Sentry.captureException(error);
  }, [error]);

  return (

    <div className="min-h-screen flex items-center justify-center p-6">

      <div className="max-w-2xl w-full rounded-[32px] border bg-white p-10 shadow-sm">

        {/* STATUS */}

        <div className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 mb-6">
          Insights Unavailable
        </div>

        {/* TITLE */}

        <h1 className="text-5xl font-bold tracking-tight text-[#243428]">
          Insights temporarily unavailable
        </h1>

        {/* DESCRIPTION */}

        <p className="text-gray-600 text-lg leading-relaxed mt-6">
          We couldn&apos;t load your insights just now. No memory data has been lost.
        </p>

        {/* ERROR */}

        <div className="mt-8 rounded-3xl border bg-[#f8faf7] p-6">

          <p className="text-sm text-gray-500 mb-2">
            Technical Details
          </p>

          <p className="font-mono text-sm text-red-700 break-all">
            {error.message}
          </p>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-4 mt-10">

          <button
            onClick={() => reset()}
            className="rounded-2xl bg-[#243428] px-6 py-4 text-white font-medium transition hover:opacity-90"
          >
            Retry Dashboard
          </button>

          <button
            onClick={() => (
              window.location.href = "/dashboard"
            )}
            className="rounded-2xl border px-6 py-4 font-medium text-[#243428] transition hover:bg-gray-50"
          >
            Return to Dashboard
          </button>

        </div>

      </div>

    </div>
  );
}
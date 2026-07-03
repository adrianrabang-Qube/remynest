"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Remy } from "@/components/remy/Remy";

export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <Remy state="confused" size={140} decorative />
      <h2 className="text-2xl font-semibold mb-4">
        Something went wrong
      </h2>

      <p className="text-gray-500 mb-6">
        An unexpected error occurred. You can try again.
      </p>

      <button
        onClick={reset}
        className="bg-green-700 text-white px-4 py-2 rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
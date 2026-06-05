"use client";

import { useState } from "react";

export default function GDPRSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gdpr/export", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `remynest-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError(
        "Something went wrong generating your export. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Data Privacy & GDPR
        </h5>

        <p className="mt-1 text-neutral-500">
          Manage privacy controls, consent settings,
          data portability, and personal data preferences.
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Export your data
        </h5>

        <p className="mt-1 text-neutral-500">
          Download a copy of your RemyNest data — profile,
          memories, reminders, caregiver relationships, and
          media references — as a JSON file.
        </p>

        <button
          onClick={handleExport}
          disabled={loading}
          className="mt-3 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading
            ? "Preparing export..."
            : "Download my data"}
        </button>

        {error && (
          <p className="mt-2 text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

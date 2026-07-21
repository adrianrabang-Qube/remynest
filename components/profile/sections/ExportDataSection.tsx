"use client";

import { useState } from "react";

/**
 * Export Your Data (Phase 1).
 *
 * Downloads a JSON copy of the user's RemyNest data via the existing, working
 * GET /api/gdpr/export endpoint. Logic mirrors the proven handler previously in
 * GDPRSection.
 */
export default function ExportDataSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gdpr/export", { method: "GET" });

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
        "Something went wrong generating your export. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sand-deep/60 p-4 text-sm">
      <h5 className="font-medium text-charcoal">Export your data</h5>

      <p className="mt-1 text-charcoal-soft">
        Download a copy of your RemyNest data — profile, memories, reminders,
        caregiver relationships, and media references — as a JSON file.
      </p>

      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
      >
        {loading ? "Preparing export..." : "Download my data"}
      </button>

      {error && (
        <p className="mt-2 text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

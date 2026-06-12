"use client";

/**
 * Triggers the browser's print engine — the "download flow" for Export V1
 * (Print → Save as PDF). Hidden in the printed output.
 */
export default function PrintButton({
  label = "Download PDF",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
    >
      {label}
    </button>
  );
}

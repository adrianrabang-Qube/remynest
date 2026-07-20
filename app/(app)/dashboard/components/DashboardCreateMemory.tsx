import Link from "next/link";

/**
 * Compact "Jump back in" entry card — links to the dedicated /memories/new page rather than
 * embedding the full CreateMemoryForm inline. The form previously rendered here brought its own
 * complete card chrome (rounded-2xl bg-white border shadow-sm), nesting inside this card's own
 * chrome and producing a long, doubled-up "card in a card" that looked like it needed its own
 * scroll. This card carries a single boundary, matching its dashboard siblings (e.g.
 * DashboardFocus's "Today's Focus" card).
 */
export default function DashboardCreateMemory() {
  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 md:p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-charcoal">Create Memory</h2>
      <p className="mt-2 text-sm text-charcoal-soft">
        Save a moment, thought, photo, or voice memory.
      </p>
      <Link
        href="/memories/new"
        className="mt-4 inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Add a memory
      </Link>
    </section>
  );
}

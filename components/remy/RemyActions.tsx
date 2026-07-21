import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import type { RemyActions as RemyActionsModel } from "@/lib/remy/actions";

/**
 * RemyActions — renders the structured action layer (lib/remy/actions.ts): a
 * primary action (with its context) + the remaining secondary actions. Consumes
 * the model directly; no intelligence or derivation. Renders nothing when there
 * are no actions (no placeholders, no fabricated actions).
 */
export default function RemyActions({ actions }: { actions: RemyActionsModel }) {
  if (!actions.primaryAction && actions.secondaryActions.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Suggested actions"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
        Actions
      </p>

      {actions.primaryAction && (
        <div className="mt-2">
          <p className="text-sm text-charcoal">{actions.primaryAction.text}</p>
          <Link
            href={actions.primaryAction.href}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-deep"
          >
            {actions.primaryAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      {actions.secondaryActions.length > 0 && (
        <ul className="mt-3 divide-y divide-sand-deep/30 border-t border-sand-deep/30 pt-1">
          {actions.secondaryActions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sm font-medium text-primary-deep transition hover:text-primary"
              >
                {action.label}
                <ChevronRight className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

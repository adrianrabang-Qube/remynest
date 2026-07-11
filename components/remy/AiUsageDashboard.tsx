import type { AiUsageOverview } from "@/lib/ai/usage/overview";

/**
 * AI usage dashboard (Phase 27) — reusable, PRESENTATIONAL (no hooks/handlers, works in server or client
 * trees). Renders the usage overview read from `ai_usage` (today/month conversations, tokens, estimated cost,
 * average latency, provider/model, subscription tier, and remaining quota). Display only — no editing.
 */

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function fmtUsd(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(4)}`;
}
function fmtMs(n: number): string {
  return n > 0 ? `${Math.round(n).toLocaleString("en-US")} ms` : "—";
}
function fmtRemaining(remaining: number | null, limit: number | null): string {
  if (limit == null || remaining == null) return "Unlimited";
  return `${fmtInt(remaining)} of ${fmtInt(limit)} left`;
}
function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand-deep/60 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-charcoal">{value}</div>
    </div>
  );
}

export default function AiUsageDashboard({ overview }: { overview: AiUsageOverview }) {
  const { today, month, gate } = overview;

  return (
    <div className="space-y-5">
      {/* Subscription + provider header */}
      <div className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
              Subscription
            </div>
            <div className="mt-1 font-serif text-xl text-charcoal">
              {tierLabel(overview.tier)}
              {overview.isPremium ? " · Unlimited AI" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
              AI provider
            </div>
            <div className="mt-1 text-sm font-medium text-charcoal">
              {overview.provider} · {overview.model}
            </div>
          </div>
        </div>
        {!overview.isPremium && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-sand/60 px-4 py-3 text-sm text-charcoal">
              <span className="text-charcoal-muted">Today: </span>
              {fmtRemaining(gate.dailyRemaining, gate.dailyLimit)}
            </div>
            <div className="rounded-2xl bg-sand/60 px-4 py-3 text-sm text-charcoal">
              <span className="text-charcoal-muted">This month: </span>
              {fmtRemaining(gate.monthlyRemaining, gate.monthlyLimit)}
            </div>
          </div>
        )}
      </div>

      {/* Today */}
      <section>
        <h3 className="mb-2 font-serif text-lg text-charcoal">Today</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Conversations" value={fmtInt(today.conversations)} />
          <Stat label="Total tokens" value={fmtInt(today.totalTokens)} />
          <Stat label="Estimated cost" value={fmtUsd(overview.estimatedDailyCostUsd)} />
          <Stat label="Prompt tokens" value={fmtInt(today.promptTokens)} />
          <Stat label="Completion tokens" value={fmtInt(today.completionTokens)} />
          <Stat label="Avg latency" value={fmtMs(today.avgLatencyMs)} />
        </div>
      </section>

      {/* This month */}
      <section>
        <h3 className="mb-2 font-serif text-lg text-charcoal">This month</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Conversations" value={fmtInt(month.conversations)} />
          <Stat label="Total tokens" value={fmtInt(month.totalTokens)} />
          <Stat label="Estimated cost" value={fmtUsd(overview.estimatedMonthlyCostUsd)} />
          <Stat label="Prompt tokens" value={fmtInt(month.promptTokens)} />
          <Stat label="Completion tokens" value={fmtInt(month.completionTokens)} />
          <Stat label="Avg latency" value={fmtMs(month.avgLatencyMs)} />
        </div>
      </section>
    </div>
  );
}

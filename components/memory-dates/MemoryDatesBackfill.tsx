"use client";

import { useState } from "react";
import {
  buildMemoryDate,
  formatMemoryDateLabel,
  formatAddedDate,
  type MemoryDateSelection,
} from "@/lib/memories/memory-date";
import {
  computeCoverage,
  coverageMilestone,
  type DateCoverage,
  type UndatedMemory,
} from "@/lib/remy/date-coverage";
import type { RemyActivity } from "@/lib/remy/types";

type SaveAction = (
  memoryId: string,
  memoryDate: string | null,
  precision: string
) => Promise<{ ok: boolean; error?: string }>;

const CURRENT_YEAR = new Date().getFullYear();
const TODAY_ISO = new Date().toISOString().split("T")[0];
const CURRENT_MONTH = TODAY_ISO.slice(0, 7);
const DECADE_OPTIONS = Array.from(
  { length: 13 },
  (_unused, i) => 1900 + i * 10
).filter((d) => d <= CURRENT_YEAR);

type BackfillMode = "exact" | "month" | "year" | "decade" | "not-sure";

const MODES: { mode: BackfillMode; label: string }[] = [
  { mode: "exact", label: "Exact date" },
  { mode: "month", label: "Month + year" },
  { mode: "year", label: "Year only" },
  { mode: "decade", label: "Decade only" },
  { mode: "not-sure", label: "Not sure" },
];

export default function MemoryDatesBackfill({
  coverage,
  memories,
  saveAction,
}: {
  coverage: DateCoverage;
  memories: UndatedMemory[];
  saveAction: SaveAction;
}) {
  const [pending, setPending] = useState(memories);
  const [dated, setDated] = useState(coverage.dated);
  const [recent, setRecent] = useState<RemyActivity[]>([]);

  const live = computeCoverage(coverage.total, dated);
  const milestone = coverageMilestone(live.percentage);

  const handleSaved = (memory: UndatedMemory, label: string) => {
    setPending((p) => p.filter((m) => m.id !== memory.id));
    setDated((d) => d + 1);
    setRecent((r) =>
      [
        {
          id: `date-${memory.id}`,
          kind: "memory-date-added" as const,
          icon: "🕰",
          title: "Memory date added",
          description: `${
            memory.ai_title || memory.title || "Untitled memory"
          } · ${label}`,
          timestamp: new Date().toISOString(),
        },
        ...r,
      ].slice(0, 8)
    );
  };

  const handleSkip = (memory: UndatedMemory) =>
    setPending((p) => p.filter((m) => m.id !== memory.id));

  return (
    <div className="space-y-6">
      {/* Progress */}
      <section className="rounded-3xl border border-sand-deep/70 bg-white p-6 shadow-soft">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-charcoal">
            {live.dated} of {live.total} dated
          </p>
          <p className="text-sm text-charcoal-muted">
            {live.percentage}% · {milestone}
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-sand-deep/40">
          <div
            className="h-full rounded-full bg-sage transition-all"
            style={{ width: `${live.percentage}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-charcoal-muted">
          <span>0–25%</span>
          <span>25–50%</span>
          <span>50–75%</span>
          <span>75–100%</span>
        </div>
      </section>

      {/* Recently added (this session) */}
      {recent.length > 0 && (
        <section className="rounded-3xl border border-sage/25 bg-sage/[0.05] p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-charcoal">
            Dates you just added
          </h2>
          <ul className="mt-3 space-y-1.5">
            {recent.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 text-sm text-charcoal-soft"
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="min-w-0 break-words">{item.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Memories needing dates */}
      {pending.length === 0 ? (
        <section className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-charcoal-soft shadow-soft">
          {live.total === 0
            ? "There are no memories here yet."
            : "Every memory in this workspace has a date. Thank you — Remy understands the story much better now."}
        </section>
      ) : (
        <ul className="space-y-4">
          {pending.map((memory) => (
            <BackfillRow
              key={memory.id}
              memory={memory}
              saveAction={saveAction}
              onSaved={handleSaved}
              onSkip={handleSkip}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BackfillRow({
  memory,
  saveAction,
  onSaved,
  onSkip,
}: {
  memory: UndatedMemory;
  saveAction: SaveAction;
  onSaved: (memory: UndatedMemory, label: string) => void;
  onSkip: (memory: UndatedMemory) => void;
}) {
  const [mode, setMode] = useState<BackfillMode>("exact");
  const [exact, setExact] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [decade, setDecade] = useState(
    String(Math.floor(CURRENT_YEAR / 10) * 10)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = memory.ai_title?.trim() || memory.title?.trim() || "Untitled memory";
  const preview = (memory.content ?? "").trim().slice(0, 160);
  const createdLabel = formatAddedDate(memory.created_at);

  const inputClass =
    "w-full rounded-lg border border-sand-deep px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/30";

  const save = async () => {
    if (mode === "not-sure") {
      onSkip(memory);
      return;
    }
    const selection: MemoryDateSelection =
      mode === "exact"
        ? { mode: "custom", customDate: exact || undefined }
        : mode === "month"
          ? { mode: "month", month: month || undefined }
          : mode === "year"
            ? { mode: "year", year: Number(year) || CURRENT_YEAR }
            : { mode: "decade", decade: Number(decade) || undefined };

    const resolved = buildMemoryDate(selection);
    if (!resolved.memoryDate) {
      setError("Please choose a date first.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await saveAction(
      memory.id,
      resolved.memoryDate,
      resolved.precision
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error || "Couldn't save the date. Please try again.");
      return;
    }

    onSaved(
      memory,
      formatMemoryDateLabel({
        created_at: resolved.memoryDate,
        memory_date: resolved.memoryDate,
        memory_date_precision: resolved.precision,
      })
    );
  };

  return (
    <li className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
      <h3 className="font-semibold text-charcoal break-words">{title}</h3>
      {preview && (
        <p className="mt-1 text-sm text-charcoal-soft break-words">
          {preview}
          {(memory.content ?? "").length > 160 ? "…" : ""}
        </p>
      )}
      {createdLabel && (
        <p className="mt-1 text-xs text-charcoal-muted">
          Added to RemyNest on {createdLabel}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {MODES.map((option) => {
          const active = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => {
                setMode(option.mode);
                setError(null);
              }}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-sage text-white"
                  : "border border-sand-deep text-charcoal-soft hover:bg-sand/40"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-64">
          {mode === "exact" && (
            <input
              type="date"
              value={exact}
              max={TODAY_ISO}
              onChange={(e) => setExact(e.target.value)}
              className={inputClass}
            />
          )}
          {mode === "month" && (
            <input
              type="month"
              value={month}
              max={CURRENT_MONTH}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClass}
            />
          )}
          {mode === "year" && (
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={CURRENT_YEAR}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
            />
          )}
          {mode === "decade" && (
            <select
              value={decade}
              onChange={(e) => setDecade(e.target.value)}
              className={inputClass}
            >
              {DECADE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          )}
          {mode === "not-sure" && (
            <p className="text-sm text-charcoal-muted">
              That&apos;s okay — Remy will keep this memory without a date.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {mode === "not-sure"
            ? "Skip for now"
            : saving
              ? "Saving…"
              : "Save date"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

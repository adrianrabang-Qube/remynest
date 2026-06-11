"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildMemoryDate,
  formatMemoryDate,
  type MemoryDateMode,
  type MemoryDateSelection,
  type ResolvedMemoryDate,
} from "@/lib/memories/memory-date";

/**
 * Reusable "When did this happen?" control — shared by the Create and Edit
 * memory modals. Emits a ResolvedMemoryDate ({ memoryDate, precision }) whenever
 * the selection changes. "Today" resolves to a null memoryDate, so the memory
 * keeps its created_at (backward-compatible).
 */
const MODES: { mode: MemoryDateMode; label: string }[] = [
  { mode: "today", label: "Today" },
  { mode: "yesterday", label: "Yesterday" },
  { mode: "custom", label: "Custom date" },
  { mode: "month", label: "Month" },
  { mode: "year", label: "Year" },
  { mode: "decade", label: "Decade" },
];

const CURRENT_YEAR = new Date().getFullYear();
const TODAY_ISO = new Date().toISOString().split("T")[0];
const CURRENT_MONTH = TODAY_ISO.slice(0, 7);

const DECADE_OPTIONS = Array.from(
  { length: 13 },
  (_unused, i) => 1900 + i * 10
).filter((d) => d <= CURRENT_YEAR);

export default function MemoryDateField({
  initial,
  onChange,
}: {
  initial?: MemoryDateSelection;
  onChange: (resolved: ResolvedMemoryDate) => void;
}) {
  const [mode, setMode] = useState<MemoryDateMode>(
    initial?.mode ?? "today"
  );
  const [customDate, setCustomDate] = useState(
    initial?.customDate ?? ""
  );
  const [month, setMonth] = useState(
    initial?.month ?? ""
  );
  const [year, setYear] = useState(
    String(initial?.year ?? CURRENT_YEAR)
  );
  const [decade, setDecade] = useState(
    String(
      initial?.decade ?? Math.floor(CURRENT_YEAR / 10) * 10
    )
  );

  const resolved = useMemo(
    () =>
      buildMemoryDate({
        mode,
        customDate: customDate || undefined,
        month: month || undefined,
        year: Number(year) || CURRENT_YEAR,
        decade: Number(decade) || undefined,
      }),
    [mode, customDate, month, year, decade]
  );

  // Keep the parent in sync without re-firing on parent identity changes.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current(resolved);
  }, [resolved]);

  const preview = resolved.memoryDate
    ? formatMemoryDate(
        new Date(resolved.memoryDate),
        resolved.precision,
        { relative: true }
      )
    : "Today";

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/30";

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          When did this happen?
        </label>
        <span className="text-xs text-gray-400">{preview}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((option) => {
          const active = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => setMode(option.mode)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-black text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {mode === "custom" && (
        <input
          type="date"
          value={customDate}
          max={TODAY_ISO}
          onChange={(e) => setCustomDate(e.target.value)}
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
          placeholder="e.g. 1995"
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
    </div>
  );
}

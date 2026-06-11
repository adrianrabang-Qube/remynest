/**
 * Historical Memory dating — shared model.
 *
 * A memory carries two independent dates:
 *   - `created_at`  : when the row was inserted (unchanged, automatic).
 *   - `memory_date` : when the memory actually HAPPENED (optional, historical).
 *
 * The "effective date" is `memory_date ?? created_at`, so existing memories
 * (memory_date NULL) keep behaving exactly as before — no backfill, no breaking
 * change. `memory_date_precision` lets a memory be dated to a day, month, year,
 * or whole decade ("the 1980s"), which is also the seam future bulk-import
 * features write through.
 *
 * Pure + side-effect free so it runs on both the client (form) and the server
 * (API validation, timeline).
 */
export const MEMORY_DATE_PRECISIONS = [
  "day",
  "month",
  "year",
  "decade",
] as const;

export type MemoryDatePrecision =
  (typeof MEMORY_DATE_PRECISIONS)[number];

export interface DatedMemory {
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
}

function isPrecision(v: unknown): v is MemoryDatePrecision {
  return (
    typeof v === "string" &&
    (MEMORY_DATE_PRECISIONS as readonly string[]).includes(v)
  );
}

/** The date a memory should be placed on in the timeline. */
export function resolveEffectiveDate(m: DatedMemory): Date {
  return new Date(m.memory_date || m.created_at);
}

export function resolveEffectivePrecision(
  m: DatedMemory
): MemoryDatePrecision {
  return isPrecision(m.memory_date_precision)
    ? m.memory_date_precision
    : "day";
}

/** True when the memory was explicitly dated to a past moment. */
export function isHistoricalMemory(m: {
  memory_date?: string | null;
}): boolean {
  return Boolean(m.memory_date);
}

/** Millisecond sort key for ordering by effective date. */
export function effectiveSortValue(m: DatedMemory): number {
  return resolveEffectiveDate(m).getTime();
}

// ---------------------------------------------------------------------------
// Formatting (precision-aware, locale-friendly)
// ---------------------------------------------------------------------------

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeDayLabel(date: Date): string | null {
  const today = startOfLocalDay(new Date()).getTime();
  const target = startOfLocalDay(date).getTime();
  const diffDays = Math.round((today - target) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return null;
}

export function formatMemoryDate(
  date: Date,
  precision: MemoryDatePrecision = "day",
  opts: { relative?: boolean } = {}
): string {
  switch (precision) {
    case "decade": {
      const start = Math.floor(date.getFullYear() / 10) * 10;
      return `${start}s`;
    }
    case "year":
      return String(date.getFullYear());
    case "month":
      return date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    case "day":
    default: {
      if (opts.relative) {
        const rel = relativeDayLabel(date);
        if (rel) return rel;
      }
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
}

/** Heading + grouping key for a memory on the timeline (precision-aware). */
export function formatMemoryGroupLabel(m: DatedMemory): string {
  return formatMemoryDate(
    resolveEffectiveDate(m),
    resolveEffectivePrecision(m)
  );
}

// ---------------------------------------------------------------------------
// Building a memory date from a UI selection (client) — shared with the form
// ---------------------------------------------------------------------------

export type MemoryDateMode =
  | "today"
  | "yesterday"
  | "last-week"
  | "custom"
  | "month"
  | "year"
  | "decade";

export interface MemoryDateSelection {
  mode: MemoryDateMode;
  /** yyyy-mm-dd, for the "custom" mode. */
  customDate?: string;
  /** yyyy-mm, for the "month" mode. */
  month?: string;
  /** e.g. 1995, for the "year" mode. */
  year?: number;
  /** decade start, e.g. 1980, for the "decade" mode. */
  decade?: number;
}

export interface ResolvedMemoryDate {
  /** ISO instant, or null to mean "now" (effective date = created_at). */
  memoryDate: string | null;
  precision: MemoryDatePrecision;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

// Noon avoids a timezone offset shifting the memory across a day boundary.
function noon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

export function buildMemoryDate(
  sel: MemoryDateSelection
): ResolvedMemoryDate {
  const now = new Date();
  switch (sel.mode) {
    case "today":
      return { memoryDate: null, precision: "day" };
    case "yesterday":
      return {
        memoryDate: noon(addDays(now, -1)).toISOString(),
        precision: "day",
      };
    case "last-week":
      return {
        memoryDate: noon(addDays(now, -7)).toISOString(),
        precision: "day",
      };
    case "custom": {
      if (!sel.customDate) return { memoryDate: null, precision: "day" };
      const parts = sel.customDate.split("-").map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return { memoryDate: null, precision: "day" };
      }
      const [y, mo, da] = parts;
      return {
        memoryDate: new Date(y, mo - 1, da, 12, 0, 0).toISOString(),
        precision: "day",
      };
    }
    case "month": {
      if (!sel.month) return { memoryDate: null, precision: "day" };
      const parts = sel.month.split("-").map(Number);
      if (parts.length !== 2 || parts.some(Number.isNaN)) {
        return { memoryDate: null, precision: "day" };
      }
      const [y, mo] = parts;
      return {
        memoryDate: new Date(y, mo - 1, 1, 12, 0, 0).toISOString(),
        precision: "month",
      };
    }
    case "year": {
      const y = sel.year ?? now.getFullYear();
      return {
        memoryDate: new Date(y, 0, 1, 12, 0, 0).toISOString(),
        precision: "year",
      };
    }
    case "decade": {
      const dec = sel.decade ?? Math.floor(now.getFullYear() / 10) * 10;
      return {
        memoryDate: new Date(dec, 0, 1, 12, 0, 0).toISOString(),
        precision: "decade",
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Server validation
// ---------------------------------------------------------------------------

export type ValidatedMemoryDate =
  | { ok: true; memoryDate: string | null; precision: MemoryDatePrecision }
  | { ok: false; error: string };

/**
 * Validate untrusted memory-date input from the request body. Empty/missing →
 * a valid "no historical date" result (memory keeps its creation date).
 */
export function validateAndResolveMemoryDate(
  memoryDate: unknown,
  precision: unknown
): ValidatedMemoryDate {
  if (memoryDate == null || memoryDate === "") {
    return { ok: true, memoryDate: null, precision: "day" };
  }
  if (typeof memoryDate !== "string") {
    return { ok: false, error: "Invalid memory date" };
  }
  const d = new Date(memoryDate);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "Invalid memory date" };
  }
  // Allow a minute of clock skew, but a memory can't happen in the future.
  if (d.getTime() > Date.now() + 60_000) {
    return { ok: false, error: "A memory's date cannot be in the future" };
  }
  if (d.getFullYear() < 1000) {
    return { ok: false, error: "Memory date is out of range" };
  }
  return {
    ok: true,
    memoryDate: d.toISOString(),
    precision: isPrecision(precision) ? precision : "day",
  };
}

// ---------------------------------------------------------------------------
// Editing — turn an existing stored memory_date back into a UI selection
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Derive the initial UI selection for editing a memory's historical date.
 * No memory_date → "today" (effective date stays created_at).
 */
export function selectionFromMemoryDate(
  memoryDate: string | null | undefined,
  precision: string | null | undefined
): MemoryDateSelection {
  if (!memoryDate) return { mode: "today" };
  const d = new Date(memoryDate);
  if (Number.isNaN(d.getTime())) return { mode: "today" };

  const p = isPrecision(precision) ? precision : "day";
  const y = d.getFullYear();

  switch (p) {
    case "decade":
      return { mode: "decade", decade: Math.floor(y / 10) * 10 };
    case "year":
      return { mode: "year", year: y };
    case "month":
      return { mode: "month", month: `${y}-${pad2(d.getMonth() + 1)}` };
    case "day":
    default:
      return {
        mode: "custom",
        customDate: `${y}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
      };
  }
}

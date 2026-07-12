/**
 * LA5.1 — Moderation config (Apple Guideline 1.2). The SINGLE source of truth for
 * report reasons / statuses / target types, shared by the DB migration, the server
 * actions, and the UI. RemyNest is a private, invite-only caregiver app — this backs
 * an in-app report + block mechanism only, NOT a social platform.
 */

/** What a report is about: an abusive user, or a piece of shared content (a memory). */
export type ReportTargetType = "user" | "content";

/** Report reasons — must stay in sync with the CHECK constraint in the migration. */
export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam" },
  { value: "fake_account", label: "Fake account" },
  { value: "inappropriate_behavior", label: "Inappropriate behaviour" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "privacy_concern", label: "Privacy concern" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

const REASON_VALUES = new Set<string>(REPORT_REASONS.map((r) => r.value));

/** Type guard — validate an untrusted reason string against the allow-list. */
export function isValidReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && REASON_VALUES.has(value);
}

/** Moderation record lifecycle (server/admin-managed; the reporter never edits it). */
export type ReportStatus = "pending" | "reviewing" | "actioned" | "dismissed";

/** Max length of the optional reporter description (mirrors the DB CHECK). */
export const MAX_REPORT_DESCRIPTION = 2000;

/**
 * The published turnaround RemyNest commits to for acting on reports (Apple 1.2 +
 * the Terms "Objectionable content & abusive behavior" clause). Kept here so the UI
 * copy and the legal page stay consistent.
 */
export const REPORT_ACTION_WINDOW_HOURS = 24;

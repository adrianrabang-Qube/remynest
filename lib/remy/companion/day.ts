/**
 * Remy Platform (v2) — tiny shared DATE helpers for the companion surfaces (local day key +
 * whole-day difference). One implementation so RemyMoments + RemyRelationship never duplicate it.
 * Pure; the caller supplies the `Date`.
 */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(fromKey);
  const to = Date.parse(toKey);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

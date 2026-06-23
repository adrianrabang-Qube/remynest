/**
 * Client-safe byte formatting. Pure, NO server imports — so client components can
 * use it without pulling in the service-role storage layer (lib/storage/usage).
 */
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let i = Math.min(
    UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  let value = bytes / Math.pow(1024, i);
  // Roll over when rounding would push the value to the next unit (e.g. a value
  // of 1023.96 KB should display as "1.0 MB", not "1024.0 KB").
  if (value >= 1023.95 && i < UNITS.length - 1) {
    i += 1;
    value = bytes / Math.pow(1024, i);
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

export function formatDisplayName(
  name?: string | null
): string {
  const normalized =
    name?.trim();

  return (
    normalized ||
    "Unnamed Profile"
  );
}

export function formatMemoryCount(
  count?: number | null
): string {
  const value =
    Number(count ?? 0);

  return `${value.toLocaleString()} memories`;
}

export function formatSubscriptionLabel(
  tier?: string | null
): string {
  if (!tier) {
    return "Free";
  }

  return (
    tier.charAt(0)
      .toUpperCase() +
    tier.slice(1)
  );
}

export function formatDashboardDate(
  date?: string | null
): string {
  if (!date) {
    return "Unknown";

  }

  return new Intl.DateTimeFormat(
    "en-IE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(date)
  );
}
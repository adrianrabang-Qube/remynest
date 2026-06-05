import { DISCLAIMERS, type DisclaimerKey } from "@/lib/constants/disclaimers";

type Variant = "banner" | "inline" | "footnote";

interface AIDisclaimerProps {
  /** Which disclaimer string to render (from lib/constants/disclaimers). */
  kind?: DisclaimerKey;
  /** Explicit text override; takes precedence over `kind`. */
  text?: string;
  /** Visual treatment. */
  variant?: Variant;
  className?: string;
}

/**
 * Accessible, non-diagnostic AI disclaimer.
 *
 * Presentational only (no hooks/handlers) so it can be used in both server and
 * client component trees. Always rendered with role="note" and AA-contrast text.
 */
export default function AIDisclaimer({
  kind = "general",
  text,
  variant = "footnote",
  className = "",
}: AIDisclaimerProps) {
  const message = text ?? DISCLAIMERS[kind];

  const base = "leading-relaxed";

  const variantClasses: Record<Variant, string> = {
    // High-contrast warm banner for prominent placement.
    banner:
      "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900",
    // Bordered note attached to a card.
    inline:
      "rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700",
    // Quiet footnote under content.
    footnote: "mt-3 text-xs text-neutral-600",
  };

  return (
    <p
      role="note"
      className={`${base} ${variantClasses[variant]} ${className}`.trim()}
    >
      {message}
    </p>
  );
}

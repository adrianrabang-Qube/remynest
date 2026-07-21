import Image from "next/image";

interface ProfileOverviewCardProps {
  name: string;
  photoUrl?: string | null;
  age?: number | null;
  /** Workspace context line, e.g. "My Nest" or "Care profile". */
  contextLabel?: string | null;
  planLabel?: string | null;
  /** Optional — only rendered if present (not in the schema today). */
  bio?: string | null;
  location?: string | null;
}

/**
 * ProfileOverviewCard — the identity header: photo (or initial), name, and any
 * available identity facts (age / location / bio). Presentational only.
 */
export default function ProfileOverviewCard({
  name,
  photoUrl,
  age,
  contextLabel,
  planLabel,
  bio,
  location,
}: ProfileOverviewCardProps) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const facts = [
    typeof age === "number" ? `Age ${age}` : null,
    location || null,
  ].filter(Boolean);

  return (
    <section className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 shrink-0 rounded-full border border-sand-deep/50 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-charcoal md:text-2xl">
            {name}
          </h1>
          {(contextLabel || planLabel) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-charcoal-muted">
              {contextLabel && <span>{contextLabel}</span>}
              {contextLabel && planLabel && <span aria-hidden>·</span>}
              {planLabel && (
                <span className="font-medium uppercase tracking-wide text-primary-deep">
                  {planLabel}
                </span>
              )}
            </p>
          )}
          {facts.length > 0 && (
            <p className="mt-1 truncate text-sm text-charcoal-soft">
              {facts.join(" · ")}
            </p>
          )}
        </div>
      </div>

      {bio && (
        <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{bio}</p>
      )}
    </section>
  );
}

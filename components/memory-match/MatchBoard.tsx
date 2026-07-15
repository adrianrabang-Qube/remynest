"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Sparkles, Trash2 } from "lucide-react";

import { Remy } from "@/lib/remy";
import { haptic, hapticSuccess } from "@/lib/haptics";
import { shuffledTrayOrder } from "@/lib/puzzles/grid";
import {
  matchSizeConfig,
  type MatchGameRecord,
} from "@/lib/memory-match/types";
import type { MatchCardPhoto } from "@/lib/memory-match/queries";
import {
  deleteMatchGame,
  recordMatchCompletion,
  replayMatchGame,
  saveMatchProgress,
} from "@/app/(app)/activities/match/actions";

/**
 * Memory Match — the tap-only board. Card ids are 0..2P-1 (pair = id / 2);
 * layout comes from the ONE seeded shuffle (`shuffledTrayOrder`, reused from
 * the puzzle core — deterministic per stored seed, so resume keeps the same
 * board). Tap one card, tap a second: match → both stay revealed; miss →
 * both stay visible for a gentle beat, then turn back. No timers, no scores.
 *
 * Accessibility: tap IS the complete interaction (no dragging anywhere);
 * every card is a ≥44px button with a state-aware label; matches/misses/
 * completion are aria-live announced; Reduce Motion drops the flip transition
 * while keeping the miss delay, so the outcome stays understandable.
 * Autosave mirrors the puzzle pattern (debounced server write + seed-checked
 * localStorage; the pending save is CANCELLED on completion so a finished
 * game can never resurrect onto the Continue shelf).
 */

const AUTOSAVE_MS = 800;
const MISS_REVEAL_MS = 1400;

function localKey(gameId: string) {
  return `remynest-match-${gameId}`;
}

export default function MatchBoard({
  game,
  initialMatched,
  cardPhotos,
}: {
  game: MatchGameRecord;
  initialMatched: number[];
  cardPhotos: MatchCardPhoto[];
}) {
  const router = useRouter();
  const size = matchSizeConfig(game.pairs);
  const cols = size?.cols ?? 4;
  const totalCards = game.pairs * 2;

  const deck = useMemo(
    () => shuffledTrayOrder(totalCards, game.shuffle_seed),
    [totalCards, game.shuffle_seed],
  );
  const photoByPair = useMemo(
    () => new Map(cardPhotos.map((p) => [p.pairIndex, p])),
    [cardPhotos],
  );

  // QA fix (2026-07-15, proven defect): face-down cards render no <img>, so a
  // photo was fetched on its FIRST flip — on slow networks the reveal showed a
  // blank card, and a mismatched second photo could flip back (1.4s window)
  // before it ever rendered. Warm every signed card image once on mount
  // (≤8 urls) so flips reveal instantly.
  useEffect(() => {
    for (const p of cardPhotos) {
      if (p.imageUrl) {
        const img = new window.Image();
        img.src = p.imageUrl;
      }
    }
  }, [cardPhotos]);

  const [matched, setMatched] = useState<ReadonlySet<number>>(() => {
    const initial = new Set(initialMatched);
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(localKey(game.id));
        if (raw) {
          const parsed = JSON.parse(raw) as { matched?: number[]; seed?: number };
          if (
            parsed.seed === game.shuffle_seed &&
            Array.isArray(parsed.matched) &&
            parsed.matched.length > initial.size
          ) {
            return new Set(
              parsed.matched.filter(
                (n) => Number.isInteger(n) && n >= 0 && n < game.pairs,
              ),
            );
          }
        }
      } catch {
        /* ignore corrupt snapshot */
      }
    }
    return initial;
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [announce, setAnnounce] = useState("");
  const [busy, setBusy] = useState(false);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complete = matched.size === game.pairs;

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- autosave (debounced + local mirror; cancelled on completion) ----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (set: ReadonlySet<number>) => {
      const pairs = [...set].sort((a, b) => a - b);
      try {
        window.localStorage.setItem(
          localKey(game.id),
          JSON.stringify({ matched: pairs, seed: game.shuffle_seed, at: Date.now() }),
        );
      } catch {
        /* storage unavailable — server save still runs */
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveMatchProgress(game.id, pairs);
      }, AUTOSAVE_MS);
    },
    [game.id, game.shuffle_seed],
  );
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (missTimer.current) clearTimeout(missTimer.current);
    },
    [],
  );

  // ---- completion ----
  const completionRecorded = useRef(false);
  useEffect(() => {
    if (!complete || completionRecorded.current) return;
    completionRecorded.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      window.localStorage.removeItem(localKey(game.id));
    } catch {
      /* no-op */
    }
    void hapticSuccess();
    setAnnounce("Every pair found. Beautifully done.");
    void recordMatchCompletion(game.id);
    // Remy celebrates through the ONE platform (semantic event).
    Remy.emit("match.completed", { gameId: game.id });
  }, [complete, game.id]);

  // ---- tap logic ----
  const tap = useCallback(
    (cardId: number) => {
      const pair = Math.floor(cardId / 2);
      if (matched.has(pair) || flipped.includes(cardId) || flipped.length >= 2) {
        return;
      }
      void haptic("light");
      if (flipped.length === 0) {
        setFlipped([cardId]);
        setAnnounce(`${photoByPair.get(pair)?.label ?? "A photo"} — now find its match.`);
        return;
      }
      const first = flipped[0];
      const firstPair = Math.floor(first / 2);
      setFlipped([first, cardId]);
      if (firstPair === pair) {
        void haptic("medium");
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(pair);
          persist(next);
          return next;
        });
        setFlipped([]);
        setAnnounce(
          `A match — ${photoByPair.get(pair)?.label ?? "this photo"}! ${matched.size + 1} of ${game.pairs} pairs found.`,
        );
      } else {
        setAnnounce("Not a match this time — both cards will turn back over.");
        missTimer.current = setTimeout(() => {
          setFlipped([]);
        }, MISS_REVEAL_MS);
      }
    },
    [matched, flipped, photoByPair, persist, game.pairs],
  );

  // ---- management ----
  const onReplay = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      window.localStorage.removeItem(localKey(game.id));
    } catch {
      /* no-op */
    }
    await replayMatchGame(game.id);
    router.refresh();
    setBusy(false);
  }, [busy, game.id, router]);

  const onDelete = useCallback(async () => {
    if (busy) return;
    if (!window.confirm("Delete this game? The photos and memories are kept.")) return;
    setBusy(true);
    const res = await deleteMatchGame(game.id);
    if (res.ok) router.push("/activities/match");
    else setBusy(false);
  }, [busy, game.id, router]);

  return (
    <div>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(matched.size > 0 || game.completed_count > 0) && (
          <button
            type="button"
            onClick={() => void onReplay()}
            disabled={busy}
            aria-label="Start this game again with a fresh shuffle"
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-sand-deep/70 bg-white px-4 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Shuffle again
          </button>
        )}
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={busy}
          aria-label="Delete this game"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-semibold text-rose-600/90 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </button>
        <span className="ml-auto text-sm text-charcoal-muted">
          {matched.size} of {game.pairs} pairs
        </span>
      </div>

      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {deck.map((cardId) => {
          const pair = Math.floor(cardId / 2);
          const photo = photoByPair.get(pair);
          const isMatched = matched.has(pair);
          const isFlipped = flipped.includes(cardId);
          const faceUp = isMatched || isFlipped || complete;
          const label = photo?.label ?? `Photo ${pair + 1}`;
          return (
            <button
              key={cardId}
              type="button"
              onClick={() => tap(cardId)}
              aria-disabled={isMatched || complete || undefined}
              aria-label={
                isMatched
                  ? `${label} — matched`
                  : isFlipped
                    ? `${label} — face up`
                    : "Hidden card — tap to turn it over"
              }
              className={`relative aspect-square min-h-11 overflow-hidden rounded-2xl border shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
                reduceMotion ? "" : "transition-transform duration-200"
              } ${
                isMatched
                  ? "border-sage ring-1 ring-sage/50"
                  : faceUp
                    ? "border-sand-deep/70"
                    : "border-sand-deep/60 bg-sand hover:bg-sand-deep/30"
              }`}
            >
              {faceUp ? (
                photo?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                  <img
                    src={photo.imageUrl}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-sand p-1 text-center text-xs font-medium text-charcoal-soft">
                    {label}
                  </span>
                )
              ) : (
                <span
                  aria-hidden
                  className="flex h-full w-full items-center justify-center"
                >
                  <Sparkles className="h-6 w-6 text-sage/60" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {complete && (
        <section
          aria-label="Game complete"
          className="mt-6 rounded-3xl border border-sand-deep/70 bg-white p-6 text-center shadow-soft"
        >
          <p className="font-serif text-xl font-semibold text-charcoal">
            Every pair found — beautifully done.
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            All these photos are still in your memories, whenever you&apos;d
            like to visit them.
          </p>
          <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void onReplay()}
              disabled={busy}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Play again
            </button>
            <Link
              href="/activities/match"
              className="flex min-h-11 items-center justify-center rounded-full border border-sand-deep/70 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              Back to Memory Match
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

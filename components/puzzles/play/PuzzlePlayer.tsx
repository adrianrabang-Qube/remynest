"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lightbulb, RotateCcw, Star, Trash2 } from "lucide-react";

import { haptic, hapticSuccess } from "@/lib/haptics";
import {
  cropBackground,
  gridForPieces,
  shuffledTrayOrder,
  tileBackground,
} from "@/lib/puzzles/grid";
import type { PuzzleRecord } from "@/lib/puzzles/types";
import {
  deletePuzzle,
  recordPuzzleCompletion,
  replayPuzzle,
  savePuzzleProgress,
  togglePuzzleFavourite,
} from "@/app/(app)/activities/puzzles/actions";

/**
 * Memory Puzzles — the play engine (Phase 1C).
 *
 * Calm-by-design: pieces snap ONLY to their correct slot (magnetic placement —
 * there is no wrong state to undo), no timers, no scores. Rendering is the
 * approved DOM-tile sprite technique: every piece is a div whose background is
 * the ONE shared photo (a single decode for the whole board), positioned with
 * the exact pixel math in lib/puzzles/grid.
 *
 * Interactions:
 *  - Drag: pointer capture on the tray piece; a floating tile follows the
 *    pointer via rAF-batched transform (no React re-render per move). Drop
 *    within ~0.7 tiles of the correct slot → snap (medium haptic); anywhere
 *    else → the piece settles back to the tray.
 *  - Tap/keyboard: select a piece (Enter/tap), then activate a slot — every
 *    empty slot is a real button (Row r, Column c), so the whole game is
 *    playable without dragging (motor/switch/screen-reader access). Wrong
 *    slot → a polite "Not quite" announcement, nothing punitive.
 *  - Ghost outline: the full photo, faint, under the empty slots (toggle).
 *  - Hint: softly glows one unplaced piece + its home for a few seconds.
 *  - Autosave: debounced server write + localStorage mirror (offline-tolerant;
 *    newest wins on load). Resume = server progress, replay = fresh seed.
 * Reduced motion: all pulses/settles become instant (motion-reduce + reduce
 * checks). Completion is Phase 1D's moment; 1C records it and shows the photo.
 */

const AUTOSAVE_MS = 800;
const TRAY_TILE = 64; // px — comfortably ≥ the 44px floor

type DragState = {
  piece: number;
  pointerId: number;
  el: HTMLElement | null;
};

function localKey(puzzleId: string) {
  return `remynest-puzzle-${puzzleId}`;
}

export default function PuzzlePlayer({
  puzzle,
  initialPlacements,
  imageUrl,
}: {
  puzzle: PuzzleRecord;
  initialPlacements: number[];
  imageUrl: string;
}) {
  const router = useRouter();
  const { cols } = gridForPieces(puzzle.pieces);
  const trayOrder = useMemo(
    () => shuffledTrayOrder(puzzle.pieces, puzzle.shuffle_seed),
    [puzzle.pieces, puzzle.shuffle_seed],
  );

  // ---- placement state (the whole game state) ----
  const [placed, setPlaced] = useState<ReadonlySet<number>>(() => {
    const initial = new Set(initialPlacements);
    // Offline tolerance: if a newer local snapshot exists, prefer it.
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(localKey(puzzle.id));
        if (raw) {
          const parsed = JSON.parse(raw) as { placements?: number[]; seed?: number };
          if (
            parsed.seed === puzzle.shuffle_seed &&
            Array.isArray(parsed.placements) &&
            parsed.placements.length > initial.size
          ) {
            return new Set(
              parsed.placements.filter(
                (n) => Number.isInteger(n) && n >= 0 && n < puzzle.pieces,
              ),
            );
          }
        }
      } catch {
        /* ignore corrupt local snapshot */
      }
    }
    return initial;
  });
  const complete = placed.size === puzzle.pieces;

  const [selected, setSelected] = useState<number | null>(null);
  const [ghost, setGhost] = useState(true);
  const [hint, setHint] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [favourite, setFavourite] = useState(puzzle.favourite);
  const [busy, setBusy] = useState(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- board measurement ----
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(320);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => setBoardPx(el.clientWidth || 320);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tilePx = boardPx / cols;

  // ---- autosave (debounced server write + local mirror) ----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (set: ReadonlySet<number>) => {
      const placements = [...set].sort((a, b) => a - b);
      try {
        window.localStorage.setItem(
          localKey(puzzle.id),
          JSON.stringify({ placements, seed: puzzle.shuffle_seed, at: Date.now() }),
        );
      } catch {
        /* storage full/unavailable — server save still runs */
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void savePuzzleProgress(puzzle.id, placements);
      }, AUTOSAVE_MS);
    },
    [puzzle.id, puzzle.shuffle_seed],
  );
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const place = useCallback(
    (piece: number) => {
      setPlaced((prev) => {
        if (prev.has(piece)) return prev;
        const next = new Set(prev);
        next.add(piece);
        persist(next);
        return next;
      });
      setSelected(null);
      setHint(null);
      void haptic("medium");
    },
    [persist],
  );

  // ---- completion (recorded once; the moment itself is Phase 1D) ----
  const completionRecorded = useRef(false);
  useEffect(() => {
    if (!complete || completionRecorded.current) return;
    completionRecorded.current = true;
    void hapticSuccess();
    try {
      window.localStorage.removeItem(localKey(puzzle.id));
    } catch {
      /* no-op */
    }
    void recordPuzzleCompletion(puzzle.id);
  }, [complete, puzzle.id]);

  // ---- drag (pointer capture on the tray tile; floating tile follows) ----
  const drag = useRef<DragState | null>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [dragging, setDragging] = useState<number | null>(null);

  const moveFloat = useCallback((x: number, y: number) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = floatRef.current;
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -60%)`;
      }
    });
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      if (!d) return;
      const board = boardRef.current?.getBoundingClientRect();
      if (!board) return;
      // Magnetic snap: within ~0.7 tiles of the piece's OWN slot centre.
      const col = d.piece % cols;
      const row = Math.floor(d.piece / cols);
      const cx = board.left + (col + 0.5) * tilePx;
      const cy = board.top + (row + 0.5) * tilePx;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist <= tilePx * 0.7) {
        place(d.piece);
        setAnnounce(`Placed. ${placed.size + 1} of ${puzzle.pieces}.`);
      } else if (
        clientX >= board.left &&
        clientX <= board.right &&
        clientY >= board.top &&
        clientY <= board.bottom
      ) {
        setAnnounce("Not quite — it slid back to the tray.");
        void haptic("light");
      }
    },
    [cols, tilePx, place, placed.size, puzzle.pieces],
  );

  // ---- hint ----
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHint = useCallback(() => {
    const remaining = trayOrder.filter((p) => !placed.has(p));
    if (remaining.length === 0) return;
    const piece = remaining[Math.floor(Math.random() * remaining.length)];
    setHint(piece);
    setAnnounce("Remy is pointing at a piece and its home.");
    void haptic("light");
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 3500);
  }, [trayOrder, placed]);
  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  // ---- slot activation (tap/keyboard placement) ----
  const trySlot = useCallback(
    (slot: number) => {
      if (selected == null) return;
      if (slot === selected) {
        place(selected);
        setAnnounce(`Placed. ${placed.size + 1} of ${puzzle.pieces}.`);
      } else {
        setAnnounce("Not quite — try another spot.");
        void haptic("light");
      }
    },
    [selected, place, placed.size, puzzle.pieces],
  );

  // ---- management actions ----
  const onFavourite = useCallback(async () => {
    setFavourite((f) => !f);
    const res = await togglePuzzleFavourite(puzzle.id);
    if (!res.ok) setFavourite((f) => !f);
  }, [puzzle.id]);

  const onReplay = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      window.localStorage.removeItem(localKey(puzzle.id));
    } catch {
      /* no-op */
    }
    await replayPuzzle(puzzle.id);
    router.refresh();
    setBusy(false);
  }, [busy, puzzle.id, router]);

  const onDelete = useCallback(async () => {
    if (busy) return;
    // Keyboard/SR-accessible confirm, matching the memories-delete convention.
    if (!window.confirm("Delete this puzzle? The memory and photo are kept.")) return;
    setBusy(true);
    const res = await deletePuzzle(puzzle.id);
    if (res.ok) router.push("/activities/puzzles");
    else setBusy(false);
  }, [busy, puzzle.id, router]);

  const trayPieces = trayOrder.filter((p) => !placed.has(p));
  const bgImage = `url(${imageUrl})`;

  return (
    <div>
      {/* Live status for screen readers (placements, hints, gentle misses). */}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ControlButton
          onClick={() => setGhost((g) => !g)}
          pressed={ghost}
          label={ghost ? "Hide picture outline" : "Show picture outline"}
        >
          {ghost ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}
        </ControlButton>
        {!complete && (
          <ControlButton onClick={showHint} label="Hint — show a piece and its home">
            <Lightbulb className="h-5 w-5" aria-hidden />
          </ControlButton>
        )}
        <ControlButton
          onClick={onFavourite}
          pressed={favourite}
          label={favourite ? "Remove from favourites" : "Add to favourites"}
        >
          <Star
            className={`h-5 w-5 ${favourite ? "fill-gold text-gold" : ""}`}
            aria-hidden
          />
        </ControlButton>
        {(placed.size > 0 || puzzle.completed_count > 0) && (
          <ControlButton onClick={onReplay} label="Start this puzzle again" disabled={busy}>
            <RotateCcw className="h-5 w-5" aria-hidden />
          </ControlButton>
        )}
        <ControlButton onClick={onDelete} label="Delete this puzzle" disabled={busy} danger>
          <Trash2 className="h-5 w-5" aria-hidden />
        </ControlButton>
        <span className="ml-auto text-sm text-charcoal-muted">
          {placed.size} of {puzzle.pieces} placed
        </span>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative mx-auto mt-4 aspect-square w-full max-w-md touch-none select-none overflow-hidden rounded-3xl border border-sand-deep bg-white shadow-soft"
      >
        {/* Ghost outline — the faint whole photo under the grid. */}
        {ghost && !complete && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.16]"
            style={{ backgroundImage: bgImage, ...cropBackground(puzzle.crop, boardPx) }}
          />
        )}

        {/* Slots + placed pieces */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: puzzle.pieces }, (_, slot) => {
            const isPlaced = placed.has(slot);
            const isHintSlot = hint === slot && !isPlaced;
            if (isPlaced) {
              return (
                <div
                  key={slot}
                  aria-hidden
                  className={
                    complete
                      ? ""
                      : "outline outline-1 -outline-offset-1 outline-white/40"
                  }
                  style={{
                    backgroundImage: bgImage,
                    ...tileBackground(puzzle.crop, cols, slot, boardPx),
                  }}
                />
              );
            }
            return (
              <button
                key={slot}
                type="button"
                onClick={() => trySlot(slot)}
                disabled={selected == null}
                aria-label={`Row ${Math.floor(slot / cols) + 1}, column ${(slot % cols) + 1}${
                  selected != null ? " — place the chosen piece here" : ""
                }`}
                className={`border border-sand-deep/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage ${
                  isHintSlot
                    ? `bg-gold-soft/60 ${reduceMotion ? "" : "animate-pulse"}`
                    : selected != null
                      ? "bg-sand/60 hover:bg-sage/15"
                      : "bg-sand/40"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Tray */}
      {!complete && (
        <div className="mt-4">
          <p className="text-sm font-medium text-charcoal-soft">
            {selected != null
              ? "Now choose its spot on the board."
              : "Pick up a piece — drag it, or tap it and then tap its spot."}
          </p>
          <ul
            className="mt-2 flex gap-2 overflow-x-auto pb-2"
            aria-label="Puzzle pieces"
          >
            {trayPieces.map((piece) => {
              const isHint = hint === piece;
              const hidden = dragging === piece;
              return (
                <li key={piece} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Piece for row ${Math.floor(piece / cols) + 1}, column ${
                      (piece % cols) + 1
                    }`}
                    aria-pressed={selected === piece}
                    onClick={() => {
                      setSelected((s) => (s === piece ? null : piece));
                      void haptic("light");
                    }}
                    onPointerDown={(e) => {
                      // Primary-pointer drag only; taps still fire onClick.
                      if (!e.isPrimary) return;
                      drag.current = { piece, pointerId: e.pointerId, el: e.currentTarget };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const d = drag.current;
                      if (!d || d.pointerId !== e.pointerId) return;
                      if (dragging == null) {
                        setDragging(piece); // drag actually started (moved)
                        void haptic("light");
                      }
                      moveFloat(e.clientX, e.clientY);
                    }}
                    onPointerUp={(e) => {
                      if (drag.current?.pointerId !== e.pointerId) return;
                      if (dragging != null) endDrag(e.clientX, e.clientY);
                      else drag.current = null; // plain tap — onClick handles selection
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      setDragging(null);
                    }}
                    style={{
                      width: TRAY_TILE,
                      height: TRAY_TILE,
                      backgroundImage: bgImage,
                      ...tileBackground(puzzle.crop, cols, piece, TRAY_TILE * cols),
                      opacity: hidden ? 0.25 : 1,
                    }}
                    className={`touch-none rounded-xl border shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
                      selected === piece
                        ? "border-sage ring-2 ring-sage"
                        : isHint
                          ? `border-gold ${reduceMotion ? "" : "animate-pulse"}`
                          : "border-white/60"
                    }`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Floating drag tile (rAF-driven transform; no re-render per move). */}
      {dragging != null && (
        <div
          ref={floatRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[70] rounded-xl border border-white/70 shadow-soft-lg"
          style={{
            width: tilePx,
            height: tilePx,
            backgroundImage: bgImage,
            ...tileBackground(puzzle.crop, cols, dragging, boardPx),
          }}
        />
      )}

      {/* Completion (Phase 1D replaces this with the full moment). */}
      {complete && (
        <p className="mt-4 text-center text-charcoal-soft">
          You pieced this memory back together.
        </p>
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
  pressed,
  disabled,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${
        danger
          ? "border-rose-100 bg-rose-50 text-rose-600/90 hover:bg-rose-100 focus-visible:ring-rose-600"
          : pressed
            ? "border-sage bg-sage/10 text-sage focus-visible:ring-sage"
            : "border-sand-deep/70 bg-white text-charcoal-soft hover:bg-sand focus-visible:ring-sage"
      }`}
    >
      {children}
    </button>
  );
}

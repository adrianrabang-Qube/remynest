"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ViewerImage = {
  url: string;
  name?: string;
  /** Untransformed signed URL — used if the medium transform fails to load. */
  fallbackUrl?: string;
};

/**
 * Full-screen photo viewer — portaled to document.body (CLAUDE.md authoritative:
 * a fixed/full-screen overlay must NOT render inline under a backdrop-filter
 * ancestor on WebKit/iOS, or position:fixed re-roots to the header box).
 *
 * Navigation: swipe (native CSS scroll-snap), prev/next buttons, ← → keys, and a
 * tappable thumbnail strip — covering mobile touch AND desktop mouse/keyboard.
 *
 * PERFORMANCE (mandatory for the WKWebView image-decode OOM): the snap track lays
 * out N slides for correct geometry but only the CURRENT ± 1 slide mounts an
 * <Image> (decodes a bitmap); the rest are empty placeholders. The thumbnail strip
 * uses the small THUMB variant (`thumbnails`) and lazy-loads, so the strip never
 * decodes full medium images. At most ~3 medium + the visible thumbs are resident.
 */
export default function PhotoViewer({
  images,
  thumbnails,
  startIndex,
  onClose,
}: {
  images: ViewerImage[];
  /** Small thumb-variant URLs (same order as `images`) for the strip; falls back to `images`. */
  thumbnails?: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [active, setActive] = useState(startIndex);
  // Slides whose transformed src failed -> render the untransformed fallbackUrl.
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const multi = images.length > 1;

  // Scroll the track to a given image (smooth) + update the decode window.
  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(images.length - 1, index));
      track.scrollTo({
        left: clamped * track.clientWidth,
        behavior: "smooth",
      });
      setActive(clamped);
    },
    [images.length]
  );

  // Scroll to the tapped image on open + lock body scroll (ref mutation only — no
  // setState in an effect). Always restore overflow on unmount.
  useEffect(() => {
    const track = trackRef.current;
    if (track) {
      track.scrollLeft = startIndex * track.clientWidth;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [startIndex]);

  // Keyboard: Escape closes, arrows navigate (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(active + 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goTo, active]);

  // Drive the decode window from the most-visible slide (setState in an observer
  // callback is event-driven, not an effect-body write).
  useEffect(() => {
    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            const i = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(i)) setActive(i);
          }
        }
      },
      { threshold: 0.5 }
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [images.length]);

  // Keep the active thumbnail visible in the strip.
  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  if (typeof document === "undefined") return null;

  const navBtn =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white backdrop-blur-sm transition disabled:pointer-events-none disabled:opacity-0";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur-sm"
      >
        ×
      </button>

      {multi ? (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {active + 1} / {images.length}
        </div>
      ) : null}

      {multi ? (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous photo"
            className={`${navBtn} left-2`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === images.length - 1}
            aria-label="Next photo"
            className={`${navBtn} right-2`}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        ref={trackRef}
        className="flex w-full flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
      >
        {images.map((img, i) => {
          const inWindow = Math.abs(i - active) <= 1;
          return (
            <div
              key={i}
              data-index={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative flex h-full w-full shrink-0 snap-center items-center justify-center"
            >
              {inWindow && img.url ? (
                <Image
                  src={
                    failed.has(i) && img.fallbackUrl
                      ? img.fallbackUrl
                      : img.url
                  }
                  alt={img.name ?? "Photo"}
                  fill
                  unoptimized
                  sizes="100vw"
                  onError={() => {
                    if (img.fallbackUrl) {
                      setFailed((prev) => {
                        const next = new Set(prev);
                        next.add(i);
                        return next;
                      });
                    }
                  }}
                  className="object-contain"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {multi ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto bg-black/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch]">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active
                  ? "border-white"
                  : "border-transparent opacity-60"
              }`}
            >
              <Image
                src={thumbnails?.[i] ?? img.url}
                alt=""
                fill
                unoptimized
                loading="lazy"
                sizes="56px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body
  );
}

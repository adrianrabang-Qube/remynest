"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ViewerImage = { url: string; name?: string };

/**
 * Full-screen photo viewer — portaled to document.body (CLAUDE.md authoritative:
 * a fixed/full-screen overlay must NOT render inline under a backdrop-filter
 * ancestor on WebKit/iOS, or position:fixed re-roots to the header box).
 *
 * Swipe = native CSS scroll-snap (no image library). PERFORMANCE (mandatory for the
 * WKWebView image-decode OOM): the snap track lays out N slides for correct geometry
 * but only the CURRENT ± 1 slide mounts an <Image> (decodes a bitmap); all other
 * slides are empty placeholders. The active slide is tracked via IntersectionObserver,
 * so at most ~3 full-res bitmaps are ever resident regardless of album size.
 */
export default function PhotoViewer({
  images,
  startIndex,
  onClose,
}: {
  images: ViewerImage[];
  startIndex: number;
  onClose: () => void;
}) {
  const [active, setActive] = useState(startIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Drive the decode window from the most-visible slide (setState in an observer
  // callback is event-driven, not an effect-body write).
  useEffect(() => {
    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            const i = Number(
              (e.target as HTMLElement).dataset.index
            );
            if (!Number.isNaN(i)) setActive(i);
          }
        }
      },
      { threshold: 0.5 }
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [images.length]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur-sm"
      >
        ×
      </button>

      {images.length > 1 ? (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {active + 1} / {images.length}
        </div>
      ) : null}

      <div
        ref={trackRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
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
                  src={img.url}
                  alt={img.name ?? "Photo"}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

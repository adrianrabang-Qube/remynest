"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { Play } from "lucide-react";

import { formatBytes } from "@/lib/storage/format";
import { useStorageUsage } from "@/components/storage/useStorageUsage";

export type ManagedAttachment = {
  url?: string;
  storagePath?: string;
  filename?: string;
  name?: string;
  type?: string;
  mimeType?: string;
  [key: string]: unknown;
};

// Phase B: photos + videos. Adding audio/PDF later is a one-line change here
// (the upload pipeline already allowlists audio/* + application/pdf).
const ACCEPTED_PREFIXES = ["image/", "video/"];
const ACCEPT_ATTR = "image/*,video/*";

function isVideo(typeOrMime?: string): boolean {
  return typeof typeOrMime === "string" && typeOrMime.startsWith("video");
}

// Pure reorder helper: a new array with the item moved from→to (no-op if out of range).
// Order is byte-neutral — the storage ledger projects bytes per attachment, not position.
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Media picker with thumbnail/preview + per-item remove, shared by memory create
 * and edit. Photos preview as thumbnails; videos preview as a play tile (no
 * `<video>` element is mounted in the picker — avoids decoding frames for every
 * selected clip). Mobile-first; renders via `next/image` `unoptimized` to match
 * the codebase's signed-URL / blob-preview convention.
 */
export default function AttachmentManager({
  existing,
  onExistingChange,
  files,
  onFilesChange,
  disabled,
}: {
  existing?: ManagedAttachment[];
  onExistingChange?: (kept: ManagedAttachment[]) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  // Object URLs for new-file previews — derived when the file set changes and
  // revoked on the next change / unmount (no setState inside an effect).
  // Only images need a preview object URL; videos render a play tile, so we don't
  // allocate (or hold) a blob URL for them.
  const previews = useMemo(
    () =>
      files.map((f) =>
        f.type.startsWith("image/") ? URL.createObjectURL(f) : ""
      ),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const { data: usage } = useStorageUsage();

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const accepted = Array.from(selected).filter((f) =>
      ACCEPTED_PREFIXES.some((p) => f.type.startsWith(p))
    );
    if (accepted.length) onFilesChange([...files, ...accepted]);
  }

  const removeBtn =
    "absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-base leading-none text-white shadow";
  const moveBtn =
    "flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white shadow transition disabled:opacity-30";
  const tile =
    "relative aspect-square overflow-hidden rounded-lg bg-gray-100";

  const existingList = existing ?? [];
  const hasAny = existingList.length > 0 || files.length > 0;

  return (
    <div className="space-y-3">
      {hasAny && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingList.map((a, i) => {
            const video = isVideo(a.type) || isVideo(a.mimeType);
            return (
              <div
                key={`existing-${(a.storagePath as string) ?? (a.url as string) ?? i}`}
                className={tile}
              >
                {video ? (
                  <VideoTile />
                ) : typeof a.url === "string" && a.url ? (
                  <Image
                    src={a.url}
                    alt={a.filename || a.name || "Photo"}
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                ) : null}
                {!disabled && onExistingChange ? (
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() =>
                      onExistingChange(existingList.filter((_, j) => j !== i))
                    }
                    className={removeBtn}
                  >
                    ×
                  </button>
                ) : null}
                {!disabled && onExistingChange && existingList.length > 1 ? (
                  <div className="absolute inset-x-1 bottom-1 z-10 flex justify-between">
                    <button
                      type="button"
                      aria-label="Move photo earlier"
                      disabled={i === 0}
                      onClick={() =>
                        onExistingChange(move(existingList, i, i - 1))
                      }
                      className={moveBtn}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Move photo later"
                      disabled={i === existingList.length - 1}
                      onClick={() =>
                        onExistingChange(move(existingList, i, i + 1))
                      }
                      className={moveBtn}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {files.map((f, i) => {
            const video = f.type.startsWith("video/");
            return (
              <div key={`new-${i}-${f.name}`} className={tile}>
                {video ? (
                  <VideoTile />
                ) : previews[i] ? (
                  <Image
                    src={previews[i]}
                    alt={f.name}
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                ) : null}
                {!disabled ? (
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() =>
                      onFilesChange(files.filter((_, j) => j !== i))
                    }
                    className={removeBtn}
                  >
                    ×
                  </button>
                ) : null}
                {!disabled && files.length > 1 ? (
                  <div className="absolute inset-x-1 bottom-1 z-10 flex justify-between">
                    <button
                      type="button"
                      aria-label="Move photo earlier"
                      disabled={i === 0}
                      onClick={() => onFilesChange(move(files, i, i - 1))}
                      className={moveBtn}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Move photo later"
                      disabled={i === files.length - 1}
                      onClick={() => onFilesChange(move(files, i, i + 1))}
                      className={moveBtn}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
          <span aria-hidden>＋</span>
          <span>Add photos or videos</span>
          <input
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {usage && !usage.degraded ? (
          <span className="text-xs text-charcoal-muted">
            {formatBytes(usage.remainingBytes)} of{" "}
            {formatBytes(usage.limitBytes)} left
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VideoTile() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-800">
      <Play
        className="h-6 w-6 fill-white text-white"
        aria-label="Video"
      />
    </div>
  );
}

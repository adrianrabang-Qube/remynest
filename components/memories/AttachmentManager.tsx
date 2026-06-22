"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";

export type ManagedAttachment = {
  url?: string;
  storagePath?: string;
  filename?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
};

/**
 * Photo picker with thumbnail preview + per-item remove, shared by memory create
 * and edit. Intentionally minimal (Phase 1/2 — no gallery/carousel/full-screen):
 *
 * - `existing`: already-saved attachments (edit only), rendered from their (signed)
 *   `url`; removing one calls `onExistingChange` with the kept set (order preserved).
 * - `files`: newly-selected images, previewed via object URLs (revoked on change).
 *
 * Image-only and mobile-first. Renders via `next/image` `unoptimized` to match the
 * codebase's signed-URL convention (no Next image-optimization for rotating signed
 * URLs / blob previews).
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
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((u) =>
        URL.revokeObjectURL(u)
      );
    };
  }, [previews]);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const images = Array.from(selected).filter((f) =>
      f.type.startsWith("image/")
    );
    if (images.length) onFilesChange([...files, ...images]);
  }

  const removeBtn =
    "absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-base leading-none text-white shadow";

  const existingList = existing ?? [];
  const hasAny = existingList.length > 0 || files.length > 0;

  return (
    <div className="space-y-3">
      {hasAny && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingList.map((a, i) => (
            <div
              key={`existing-${(a.storagePath as string) ?? (a.url as string) ?? i}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
            >
              {typeof a.url === "string" && a.url ? (
                <Image
                  src={a.url}
                  alt={(a.filename as string) || (a.name as string) || "Photo"}
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-cover"
                />
              ) : null}
              {!disabled && onExistingChange ? (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() =>
                    onExistingChange(existingList.filter((_, j) => j !== i))
                  }
                  className={removeBtn}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}

          {files.map((f, i) => (
            <div
              key={`new-${i}-${f.name}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
            >
              {previews[i] ? (
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
                  aria-label="Remove photo"
                  onClick={() =>
                    onFilesChange(files.filter((_, j) => j !== i))
                  }
                  className={removeBtn}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span aria-hidden>＋</span>
        <span>Add photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

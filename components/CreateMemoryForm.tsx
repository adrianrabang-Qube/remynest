"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { Remy } from "@/lib/remy";

import {
  buildMemoryDate,
  formatMemoryDate,
  type MemoryDateMode,
} from "@/lib/memories/memory-date";

import AttachmentManager from "@/components/memories/AttachmentManager";
import VoiceRecorderField from "@/components/memories/VoiceRecorderField";
import {
  uploadAttachmentsDirect,
  UploadQuotaError,
} from "@/lib/memory-direct-upload";
import StorageFullModal, {
  type UploadQuotaPayload,
} from "@/components/storage/StorageFullModal";

const MEMORY_FORM_TAG =
  "create-memory-form";

// Progressive disclosure: the common quick choices stay always visible; the less-common
// approximate choices (year / decade) live in a secondary disclosure (see the render below) so
// the section doesn't default to showing all six as equal-weight rows.
const PRIMARY_DATE_OPTIONS: {
  mode: MemoryDateMode;
  label: string;
}[] = [
  { mode: "today", label: "Today" },
  { mode: "yesterday", label: "Yesterday" },
  { mode: "last-week", label: "Last week" },
  { mode: "custom", label: "Custom date" },
];

const SECONDARY_DATE_OPTIONS: {
  mode: MemoryDateMode;
  label: string;
}[] = [
  { mode: "year", label: "A year" },
  { mode: "decade", label: "A decade" },
];

const CURRENT_YEAR = new Date().getFullYear();

const DECADE_OPTIONS = Array.from(
  { length: 13 },
  (_unused, i) => 1900 + i * 10
).filter((d) => d <= CURRENT_YEAR);

const MAX_TITLE_LENGTH =
  120;

const MAX_CONTENT_LENGTH =
  5_000;

const MIN_CONTENT_LENGTH =
  3;

function logMemoryFormStage(
  stage: string,
  metadata?: unknown
) {
  console.info(
    `[${MEMORY_FORM_TAG}] ${stage}`,
    metadata || {}
  );
}

function logMemoryFormError(
  stage: string,
  error: unknown
) {
  console.error(
    `[${MEMORY_FORM_TAG}] ${stage}`,
    error
  );
}

function normalizeInput(
  value: string,
  maxLength: number
) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export default function CreateMemoryForm({
  voiceFirst = false,
}: {
  /** Voice-discoverability entry (?voice=1): render the EXISTING recorder
   *  prominently at the top of the form. Never auto-starts the microphone —
   *  the user still explicitly taps Record. Everything else is unchanged
   *  (same validation, same upload, same reset). */
  voiceFirst?: boolean;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const requestIdRef = useRef(
    crypto.randomUUID()
  );

  const [isPending, startTransition] =
    useTransition();

  const [title, setTitle] = useState("");

  const [content, setContent] =
    useState("");

  // ── When did this memory happen? (historical dating) ──────────────────────
  const [dateMode, setDateMode] =
    useState<MemoryDateMode>("today");

  const [customDate, setCustomDate] =
    useState("");

  const [yearValue, setYearValue] =
    useState(String(CURRENT_YEAR));

  const [decadeValue, setDecadeValue] =
    useState(
      String(
        Math.floor(CURRENT_YEAR / 10) * 10
      )
    );

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [storageFull, setStorageFull] =
    useState<UploadQuotaPayload | null>(null);

  const [files, setFiles] =
    useState<File[]>([]);

  // Voice Memory v1 — a single in-app recording, uploaded through the SAME
  // direct-to-storage pipeline as picked files (quota/paths/signing inherited).
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  // =====================================
  // NORMALIZED INPUTS
  // =====================================

  const normalizedTitle = useMemo(() => {
    return normalizeInput(
      title,
      MAX_TITLE_LENGTH
    );
  }, [title]);

  const normalizedContent = useMemo(() => {
    return normalizeInput(
      content,
      MAX_CONTENT_LENGTH
    );
  }, [content]);

  const resolvedMemoryDate = useMemo(() => {
    return buildMemoryDate({
      mode: dateMode,
      customDate: customDate || undefined,
      year: Number(yearValue) || CURRENT_YEAR,
      decade:
        Number(decadeValue) || undefined,
    });
  }, [
    dateMode,
    customDate,
    yearValue,
    decadeValue,
  ]);

  const memoryDatePreview = useMemo(() => {
    if (!resolvedMemoryDate.memoryDate) {
      return "Today";
    }
    return formatMemoryDate(
      new Date(
        resolvedMemoryDate.memoryDate
      ),
      resolvedMemoryDate.precision,
      { relative: true }
    );
  }, [resolvedMemoryDate]);

  // =====================================
  // LIFECYCLE OBSERVABILITY
  // =====================================

  useEffect(() => {
    const requestId = requestIdRef.current;

    logMemoryFormStage(
      "memory-form-mounted",
      {
        requestId,
      }
    );

    return () => {
      logMemoryFormStage(
        "memory-form-unmounted",
        {
          requestId,
        }
      );
    };
  }, []);

  // =====================================
  // VALIDATION
  // =====================================

  const validationError = useMemo(() => {
    if (
      normalizedContent.length <
      MIN_CONTENT_LENGTH
    ) {
      return `Memory content must contain at least ${MIN_CONTENT_LENGTH} characters`;
    }

    return null;
  }, [normalizedContent]);

  // =====================================
  // SUBMIT
  // =====================================

  const handleSubmit = useCallback(
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        loading ||
        isPending
      ) {
        return;
      }

      if (validationError) {
        setErrorMessage(
          validationError
        );

        return;
      }

      const submitStart =
        performance.now();

      try {
        setLoading(true);

        setErrorMessage(null);

        logMemoryFormStage(
          "memory-submit-started",
          {
            requestId:
              requestIdRef.current,

            titleLength:
              normalizedTitle.length,

            contentLength:
              normalizedContent.length,
          }
        );

        let response: Response;

        const uploadFiles = voiceFile ? [...files, voiceFile] : files;

        if (uploadFiles.length > 0) {
          // Direct-to-storage: upload files STRAIGHT to Supabase Storage (no bytes
          // through the API route → no ~4.5 MB limit), then create with JSON metadata.
          let newAttachments;
          try {
            newAttachments = await uploadAttachmentsDirect(uploadFiles);
          } catch (uploadErr) {
            if (uploadErr instanceof UploadQuotaError) {
              setStorageFull(uploadErr.quota as UploadQuotaPayload);
            } else {
              setErrorMessage(
                uploadErr instanceof Error && uploadErr.message
                  ? uploadErr.message
                  : "Upload failed. Please try again."
              );
            }
            return;
          }

          response = await fetch("/api/memories/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: normalizedTitle,
              content: normalizedContent,
              memoryDate: resolvedMemoryDate.memoryDate,
              memoryDatePrecision: resolvedMemoryDate.precision,
              attachments: newAttachments,
            }),
          });
        } else {
          response = await fetch(
            "/api/memories/create",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                title:
                  normalizedTitle,

                content:
                  normalizedContent,

                memoryDate:
                  resolvedMemoryDate.memoryDate,

                memoryDatePrecision:
                  resolvedMemoryDate.precision,
              }),
            }
          );
        }

        const data =
          await response.json();

        if (!response.ok) {
          logMemoryFormError(
            "memory-submit-failed",
            {
              requestId:
                requestIdRef.current,

              data,
            }
          );

          if (response.status === 413 && data?.quota) {
            setStorageFull(data.quota as UploadQuotaPayload);
          } else {
            setErrorMessage(
              data.error ||
                "Failed to create memory"
            );
          }

          return;
        }

        // Deferred AI enrichment — fire-and-forget so the save is instant. The memory
        // is already persisted + returned; enrichment (insights/embedding/people/
        // clusters/relationships) runs in its own request and is idempotent/retryable.
        if (data?.id) {
          void fetch(`/api/memories/${data.id}/enrich`, {
            method: "POST",
          }).catch(() => {});
        }

        const durationMs =
          Number(
            (
              performance.now() -
              submitStart
            ).toFixed(2)
          );

        logMemoryFormStage(
          "memory-submit-completed",
          {
            requestId:
              requestIdRef.current,

            durationMs,

            memoryId:
              data?.memory?.id ||
              null,
          }
        );

        setTitle("");

        setContent("");

        setFiles([]);

        setVoiceFile(null);

        // A new memory may have added attachments — refresh storage usage so the
        // card/banner reflect it immediately (no storage-accounting change).
        queryClient.invalidateQueries({
          queryKey: ["storage-usage"],
        });

        showToast("Memory saved");
        Remy.emit("memory.created");

        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
        Remy.emit("failure");
        logMemoryFormError(
          "memory-submit-error",
          {
            requestId:
              requestIdRef.current,

            error,
          }
        );

        setErrorMessage(
          "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      isPending,
      validationError,
      normalizedTitle,
      normalizedContent,
      resolvedMemoryDate,
      files,
      voiceFile,
      router,
      queryClient,
      showToast,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Create Memory
        </h2>

        <p className="text-gray-500 text-sm mt-1">
          {voiceFirst
            ? "Record it in your own words, then add a title and a note."
            : "Save something important."}
        </p>
      </div>

      {voiceFirst && (
        <VoiceRecorderField file={voiceFile} onChange={setVoiceFile} />
      )}

      <label htmlFor="memory-title" className="sr-only">
        Memory title
      </label>
      <input
        id="memory-title"
        type="text"
        placeholder="Memory title"
        value={title}
        maxLength={MAX_TITLE_LENGTH}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? "memory-validation-error" : undefined}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
      />

      <label htmlFor="memory-content" className="sr-only">
        Write your memory
      </label>
      <textarea
        id="memory-content"
        placeholder="Write your memory..."
        value={content}
        rows={5}
        maxLength={MAX_CONTENT_LENGTH}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? "memory-validation-error" : undefined}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 resize-none"
      />

      {/* When did this happen? — historical dating. Progressive disclosure: the header
          always shows the resolved selection; Today/Yesterday/Last week/Custom date are
          the common quick choices and stay always visible; the less-common approximate
          choices (a year, a decade) live inside an uncontrolled native <details> so they
          don't compete for space by default. Uncontrolled deliberately — dateMode can only
          become "year"/"decade" by clicking a button that lives inside this disclosure, so
          it never needs to auto-open, and staying uncontrolled means a later unrelated
          re-render (e.g. typing in the title/content fields) can never fight a user's
          manual expand/collapse. All state, validation, and the custom/year/decade inputs
          are byte-identical to before — only the layout changed. */}
      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-gray-700">
            When did this happen?
          </label>
          <span className="text-xs text-charcoal-soft">
            {memoryDatePreview}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRIMARY_DATE_OPTIONS.map(
            (option) => {
              const active =
                dateMode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setDateMode(
                      option.mode
                    )
                  }
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm transition ${
                    active
                      ? "bg-black text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            }
          )}
        </div>

        {dateMode === "custom" && (
          <input
            type="date"
            aria-label="Exact date this happened"
            value={customDate}
            max={
              new Date()
                .toISOString()
                .split("T")[0]
            }
            onChange={(e) =>
              setCustomDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        )}

        <details className="group rounded-lg [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ChevronDown
              aria-hidden
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
            />
            Approximate date (a year or a decade)
          </summary>

          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-2">
              {SECONDARY_DATE_OPTIONS.map(
                (option) => {
                  const active =
                    dateMode === option.mode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setDateMode(
                          option.mode
                        )
                      }
                      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm transition ${
                        active
                          ? "bg-black text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                }
              )}
            </div>

            {dateMode === "year" && (
              <input
                type="number"
                inputMode="numeric"
                aria-label="Year this happened"
                min={1900}
                max={CURRENT_YEAR}
                value={yearValue}
                onChange={(e) =>
                  setYearValue(
                    e.target.value
                  )
                }
                placeholder="e.g. 1995"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            )}

            {dateMode === "decade" && (
              <select
                aria-label="Decade this happened"
                value={decadeValue}
                onChange={(e) =>
                  setDecadeValue(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
              >
                {DECADE_OPTIONS.map(
                  (decade) => (
                    <option
                      key={decade}
                      value={decade}
                    >
                      {decade}s
                    </option>
                  )
                )}
              </select>
            )}
          </div>
        </details>
      </div>

      {/* Photos — optional; multi-photo via the shared picker */}
      <div className="space-y-2 rounded-xl border border-gray-200 p-4">
        <label className="text-sm font-medium text-gray-700">
          Photos
        </label>
        {!voiceFirst && (
          <VoiceRecorderField file={voiceFile} onChange={setVoiceFile} />
        )}

        <AttachmentManager
          files={files}
          onFilesChange={setFiles}
          disabled={loading || isPending}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-charcoal-soft">
        <span>
          {normalizedContent.length} /
          {MAX_CONTENT_LENGTH}
        </span>

        {validationError && (
          <span
            id="memory-validation-error"
            role="alert"
            className="text-red-600"
          >
            {validationError}
          </span>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {errorMessage}
        </div>
      )}

      <StorageFullModal
        quota={storageFull}
        onClose={() => setStorageFull(null)}
      />

      <button
        type="submit"
        disabled={
          loading ||
          isPending ||
          Boolean(validationError)
        }
        className="bg-black text-white px-5 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {loading || isPending
          ? "Saving..."
          : "Save Memory"}
      </button>
    </form>
  );
}
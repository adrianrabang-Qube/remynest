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

const MEMORY_FORM_TAG =
  "create-memory-form";

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

export default function CreateMemoryForm() {
  const router = useRouter();

  const requestIdRef = useRef(
    crypto.randomUUID()
  );

  const [isPending, startTransition] =
    useTransition();

  const [title, setTitle] = useState("");

  const [content, setContent] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

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

        const response = await fetch(
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
            }),
          }
        );

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

          setErrorMessage(
            data.error ||
              "Failed to create memory"
          );

          return;
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

        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
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
      router,
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
          Save something important.
        </p>
      </div>

      <input
        type="text"
        placeholder="Memory title"
        value={title}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
      />

      <textarea
        placeholder="Write your memory..."
        value={content}
        rows={5}
        maxLength={MAX_CONTENT_LENGTH}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none resize-none"
      />

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {normalizedContent.length} /
          {MAX_CONTENT_LENGTH}
        </span>

        {validationError && (
          <span className="text-red-500">
            {validationError}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

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
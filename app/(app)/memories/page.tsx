"use client";

export const dynamic = "force-dynamic";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { Plus, Search, X } from "lucide-react";

import MemorySection from "@/components/memories/MemorySection";
import { Remy, RemyStage } from "@/lib/remy";
import { useIsNativePlatform } from "@/lib/platform";
import { ACTIVE_PROFILE_QUERY_KEY } from "@/lib/active-profile-cache";
import CreateMemoryModal from "@/components/CreateMemoryModal";
import EditMemoryModal from "@/components/EditMemoryModal";
import {
  uploadAttachmentsDirect,
  UploadQuotaError,
  type DirectAttachment,
} from "@/lib/memory-direct-upload";
import StorageFullModal, {
  type UploadQuotaPayload,
} from "@/components/storage/StorageFullModal";
import { useToast } from "@/components/ToastProvider";
import {
  resolveEffectiveDate,
  effectiveSortValue,
} from "@/lib/memories/memory-date";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
};

type ApiMetadata = {
  requestId?: string;
  durationMs?: number;
  memoryCount?: number;
};

type MemoriesApiResponse = {
  success?: boolean;
  data?: Memory[];
  results?: Memory[];
  error?: string;
  metadata?: ApiMetadata;
};

function normalizeMemoryArray(
  payload: unknown
): Memory[] {
  // raw array support
  if (Array.isArray(payload)) {
    return payload as Memory[];
  }

  // wrapped enterprise response
  if (
    payload &&
    typeof payload === "object"
  ) {
    const typedPayload =
      payload as MemoriesApiResponse;

    if (
      Array.isArray(
        typedPayload.data
      )
    ) {
      return typedPayload.data;
    }

    if (
      Array.isArray(
        typedPayload.results
      )
    ) {
      return typedPayload.results;
    }
  }

  return [];
}

/**
 * Calm feed skeleton (Project Polaris Pass 2) — replaces the raw "Loading memories…" text and
 * the yellow workspace-loading banner. Decorative (aria-hidden); the live status is announced
 * via a sibling role="status" region. Honors prefers-reduced-motion.
 */
function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-sand-deep/25 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function MemoriesPageContent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showCreate, setShowCreate] =
    useState(false);

  const [storageFull, setStorageFull] =
    useState<UploadQuotaPayload | null>(null);

  const [editingMemory, setEditingMemory] =
    useState<Memory | null>(null);

  // =========================
  // ACTIVE PROFILE (reactive — RDAT-002)
  //   Sourced from a React Query query (NOT a one-time useEffect) so a workspace
  //   switch can invalidate ["active-profile"] and have the memory feed + search
  //   re-scope IMMEDIATELY, with no remount. The data query stays keyed on
  //   activeProfileId, so the new value flows straight into the query key.
  // =========================
  const { data: activeProfile } = useQuery<{
    activeProfileId: string | null;
  }>({
    queryKey: ACTIVE_PROFILE_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/active-profile", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load active profile");
      }
      return res.json();
    },
    staleTime: 0,
  });

  // `undefined` while loading (gates the memories query exactly as before);
  // then `null` = My Nest, or the care profile id.
  const activeProfileId: string | null | undefined =
    activeProfile === undefined
      ? undefined
      : activeProfile.activeProfileId === null
        ? null
        : activeProfile.activeProfileId || null;

  const isMyNestContext = activeProfileId === null;

  const workspaceType = isMyNestContext ? "my-nest" : "care";

  // =========================
  // SEMANTIC SEARCH STATE
  // =========================
  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Memory[]>([]);

  const [isSearching, setIsSearching] =
    useState(false);

  // Apple 3.1.1: on native, premium-gated semantic search shows a neutral notice
  // instead of a silent dead-end. Web behavior is unchanged (notice stays null).
  const native = useIsNativePlatform();
  const [searchNotice, setSearchNotice] =
    useState<string | null>(null);

  const isSearchActive =
    searchQuery.trim().length > 0;

  // =========================
  // LIVE SEARCH
  // =========================
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchNotice(null);
      return;
    }

    try {
      setIsSearching(true);
      Remy.emit("search.started");
      setSearchNotice(null);

      const res = await fetch(
        "/api/memories/search",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            profileId:
              activeProfileId,
            workspaceType,
          }),
        }
      );

      if (res.status === 402) {
        // Premium-gated semantic search. On native there is no purchase UI, so
        // show a neutral notice instead of a silent dead-end; on web, preserve the
        // existing behavior (fall through to the throw below).
        if (native) {
          setSearchResults([]);
          setSearchNotice(
            "Semantic search is a Premium feature."
          );
          return;
        }
      }

      if (!res.ok) {
        throw new Error(
          "Search failed"
        );
      }

      const responseData =
        await res.json();

      const normalizedResults = Array.isArray(
        responseData
      )
        ? responseData
        : Array.isArray(responseData.results)
        ? responseData.results
        : Array.isArray(responseData.data)
        ? responseData.data
        : [];

      console.log(
        "[memories-search-ui] normalized-results",
        {
          query: searchQuery,
          resultCount:
            normalizedResults.length,
          rawResponse:
            responseData,
        }
      );

      setSearchResults(
        normalizedResults
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
      Remy.emit("search.finished");
    }
  }, [searchQuery, activeProfileId, workspaceType, native]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void handleSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [handleSearch]);

  // =========================
  // FETCH MEMORIES
  // =========================
  const {
    data: memories = [],
    isLoading,
    isFetching,
  } = useQuery<Memory[]>({
    queryKey: [
  "memories",
  workspaceType,
  activeProfileId,
],

    enabled:
      activeProfileId !== undefined,

    queryFn: async () => {
      const PAGE_SIZE = 50;
      const base = activeProfileId
        ? `/api/memories?profileId=${activeProfileId}`
        : // My Nest: send the workspace EXPLICITLY so the API scopes to My Nest from the
          // request param, NOT the active-context cookie — otherwise a Care→My Nest switch
          // races WKWebView cookie propagation and the bare /api/memories falls back to the
          // still-stale cookie, re-serving the previous Care workspace's memories.
          `/api/memories?workspaceType=my-nest`;

      // Server-paginated (bounds the per-request transform-signing fan-out),
      // aggregated back into the flat array the feed + optimistic mutations use.
      const all: Memory[] = [];
      let offset = 0;

      for (;;) {
        const url = `${base}${
          base.includes("?") ? "&" : "?"
        }limit=${PAGE_SIZE}&offset=${offset}`;

        const res = await fetch(url, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch memories");
        }

        const responseData = await res.json();
        const page = normalizeMemoryArray(responseData);
        all.push(...page);

        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      console.log("[memories-page] fetch-complete", {
        memoryCount: all.length,
      });

      return all;
    },

    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // =========================
  // CREATE
  // =========================
  const createMutation = useMutation({
    mutationFn: async (data: {
  title: string;
  content: string;
  uploadedFiles?: File[];
  memoryDate?: string | null;
  memoryDatePrecision?: string;
}) => {
      // Direct-to-storage: upload files STRAIGHT to Supabase (no bytes through the API),
      // then create with JSON-only metadata via the production create route.
      let newAttachments: DirectAttachment[] = [];
      try {
        newAttachments = await uploadAttachmentsDirect(data.uploadedFiles ?? []);
      } catch (uploadErr) {
        if (uploadErr instanceof UploadQuotaError) {
          const err = new Error("Storage limit exceeded") as Error & {
            quota?: UploadQuotaPayload;
          };
          err.quota = uploadErr.quota as UploadQuotaPayload;
          throw err;
        }
        throw uploadErr instanceof Error ? uploadErr : new Error("Upload failed");
      }

      const res = await fetch("/api/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          memoryDate: data.memoryDate ?? null,
          memoryDatePrecision: data.memoryDatePrecision ?? "day",
          attachments: newAttachments,
        }),
      });

      if (!res.ok) {
        let quota: UploadQuotaPayload | undefined;
        let message = "Failed to create memory";
        try {
          const body = await res.json();
          message = body?.error || body?.details || message;
          if (res.status === 413) quota = body?.quota;
        } catch {
          /* non-JSON error body (e.g. platform body-size 413) */
        }
        const err = new Error(message) as Error & {
          quota?: UploadQuotaPayload;
        };
        if (quota) err.quota = quota;
        throw err;
      }

      const created = await res.json();
      // Deferred AI enrichment — fire-and-forget (memory already saved).
      if (created?.id) {
        void fetch(`/api/memories/${created.id}/enrich`, {
          method: "POST",
        }).catch(() => {});
      }
      return created;
    },

    onMutate: async (newMemory) => {
      await queryClient.cancelQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ]
        );

      const optimistic: Memory = {
        id: crypto.randomUUID(),
        title: newMemory.title,
        content: newMemory.content,
        created_at:
          new Date().toISOString(),
      };

      queryClient.setQueryData<Memory[]>(
        [
          "memories",
          workspaceType,
          activeProfileId,
        ],
        (old = []) => [
          optimistic,
          ...old,
        ]
      );

      return { previous };
    },

    onError: (
      _err,
      _newMemory,
      context
    ) => {
      Remy.emit("failure");
      const quota = (_err as Error & { quota?: UploadQuotaPayload }).quota;
      if (quota) setStorageFull(quota);
      if (context?.previous) {
        queryClient.setQueryData(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ],
          context.previous
        );
      }
    },

    onSuccess: () => {
      Remy.emit("memory.created");
      // Close only on success — a quota 413 keeps the modal open so the draft +
      // picked files survive for retry after the user frees space.
      setShowCreate(false);
      showToast("Memory saved");
      queryClient.invalidateQueries({
        queryKey: ["storage-usage"],
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });
    },
  });

  // =========================
  // UPDATE
  // =========================
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      memoryDate,
      memoryDatePrecision,
      attachments,
      uploadedFiles,
    }: {
      id: string;
      title: string;
      content: string;
      memoryDate?: string | null;
      memoryDatePrecision?: string;
      attachments?: unknown[];
      uploadedFiles?: File[];
    }) => {
      // Direct-to-storage: upload NEW files STRAIGHT to Supabase (no bytes through the
      // PUT route → no ~4.5 MB limit), then send metadata-only JSON. The route merges
      // kept + new attachments and recomputes the cover.
      let newAttachments: DirectAttachment[] = [];
      try {
        newAttachments = await uploadAttachmentsDirect(uploadedFiles ?? []);
      } catch (uploadErr) {
        if (uploadErr instanceof UploadQuotaError) {
          const err = new Error("Storage limit exceeded") as Error & {
            quota?: UploadQuotaPayload;
          };
          err.quota = uploadErr.quota as UploadQuotaPayload;
          throw err;
        }
        throw uploadErr instanceof Error ? uploadErr : new Error("Upload failed");
      }

      const res = await fetch(`/api/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          profileId: activeProfileId ?? "",
          memoryDate: memoryDate || null,
          memoryDatePrecision: memoryDatePrecision ?? "day",
          attachments: attachments ?? [],
          newAttachments,
        }),
      });

      if (!res.ok) {
        let quota: UploadQuotaPayload | undefined;
        let message = "Failed to update memory";
        if (res.status === 413) {
          try {
            const body = await res.json();
            quota = body?.quota;
            message = body?.error || message;
          } catch {
            /* ignore parse errors */
          }
        }
        const err = new Error(message) as Error & {
          quota?: UploadQuotaPayload;
        };
        if (quota) err.quota = quota;
        throw err;
      }
    },

    onMutate: async (updated) => {
      await queryClient.cancelQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ]
        );

      queryClient.setQueryData<Memory[]>(
        [
          "memories",
          workspaceType,
          activeProfileId,
        ],
        (old = []) =>
          old.map((m) =>
            m.id === updated.id
              ? { ...m, ...updated }
              : m
          )
      );

      return { previous };
    },

    onError: (
      _err,
      _updated,
      context
    ) => {
      Remy.emit("failure");
      const quota = (_err as Error & { quota?: UploadQuotaPayload }).quota;
      if (quota) setStorageFull(quota);
      if (context?.previous) {
        queryClient.setQueryData(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ],
          context.previous
        );
      }
    },

    onSuccess: () => {
      Remy.emit("memory.saved");
      // Close only on success — a quota 413 keeps the edit modal open for retry.
      setEditingMemory(null);
      queryClient.invalidateQueries({
        queryKey: ["storage-usage"],
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });
    },
  });

  // =========================
  // DELETE
  // =========================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/memories/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to delete memory"
        );
      }
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ]
        );

      queryClient.setQueryData<Memory[]>(
        [
          "memories",
          workspaceType,
          activeProfileId,
        ],
        (old = []) =>
          old.filter((m) => m.id !== id)
      );

      return { previous };
    },

    onError: (
      _err,
      _id,
      context
    ) => {
      Remy.emit("failure");
      if (context?.previous) {
        queryClient.setQueryData(
          [
            "memories",
            workspaceType,
            activeProfileId,
          ],
          context.previous
        );
      }
    },

    onSuccess: () => {
      Remy.emit("memory.deleted");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "memories",
          workspaceType,
          activeProfileId,
        ],
      });
      // Deleting a memory frees storage — refresh the usage card/banner immediately.
      queryClient.invalidateQueries({
        queryKey: ["storage-usage"],
      });
    },
  });

  // =========================
  // SORT
  // =========================
  const normalizedMemories =
  normalizeMemoryArray(
    memories
  );

const sortedMemories = [
  ...normalizedMemories,
].sort(
    (a, b) =>
      effectiveSortValue(b) -
      effectiveSortValue(a)
  );

  // =========================
  // GROUPING
  // =========================
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(
    startOfToday
  );

  startOfWeek.setDate(
    startOfWeek.getDate() - 7
  );

  const today: Memory[] = [];
  const thisWeek: Memory[] = [];
  const earlier: Memory[] = [];

  sortedMemories.forEach(
    (memory) => {
      const date =
        resolveEffectiveDate(memory);

      if (date >= startOfToday) {
        today.push(memory);
      } else if (
        date >= startOfWeek
      ) {
        thisWeek.push(memory);
      } else {
        earlier.push(memory);
      }
    }
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:space-y-6 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
            Your memories
          </h1>
          <p className="mt-0.5 text-sm text-charcoal-muted">
            Your saved moments, newest first.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-[15px] font-semibold text-white shadow-soft transition hover:bg-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New memory
        </button>
      </header>

      {/* Workspace context loading — calm, replaces the raw yellow banner */}
      {activeProfileId === undefined && (
        <p
          role="status"
          className="rounded-2xl border border-sand-deep/60 bg-sand/40 px-4 py-3 text-sm text-charcoal-muted"
        >
          Loading your workspace…
        </p>
      )}

      {/* Semantic search — brand field with a live clear affordance; sticky on mobile so it
          stays reachable while scrolling. Debounced live search + Enter-to-search preserved. */}
      <div className="max-md:sticky max-md:top-[calc(3.5rem_+_env(safe-area-inset-top))] max-md:z-20 max-md:-mx-4 max-md:bg-sand/95 max-md:px-4 max-md:py-2 max-md:backdrop-blur">
        <div className="relative">
          <label htmlFor="memory-search" className="sr-only">
            Search memories
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted"
            aria-hidden
          />
          <input
            id="memory-search"
            type="text"
            inputMode="search"
            placeholder="Search memories"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            // text-base (16px): never drop below iOS's 16px focus-zoom threshold on the sticky
            // mobile search (the old field inherited the 16px base — 15px would zoom on tap).
            className="w-full rounded-full border border-sand-deep/70 bg-white py-2 pl-11 pr-11 text-base text-charcoal placeholder:text-charcoal-muted transition focus:border-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Live status — screen-reader announced; quiet visible text only while active */}
      <div role="status" aria-live="polite">
        {isFetching && !isLoading && (
          <p className="text-xs text-charcoal-muted">Updating…</p>
        )}
        {isSearching && (
          <p className="text-sm text-charcoal-muted">Searching…</p>
        )}
      </div>

      {/* Feed loading — calm skeleton (replaces the raw "Loading memories…" text) */}
      {isLoading && <FeedSkeleton />}

      {/* Search Results */}
      {isSearchActive &&
        searchResults.length > 0 && (
          <MemorySection
            label={`Search results · ${searchResults.length} found`}
            memories={searchResults}
            onEdit={(m) => setEditingMemory(m)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}

      {/* Premium-gated search notice — native only; neutral, no purchase CTA. */}
      {searchNotice && (
        <div className="rounded-xl border border-sand-deep/60 bg-sand/30 p-6 text-center">
          <p className="text-sm text-charcoal-soft">
            {searchNotice}
          </p>
        </div>
      )}

      {/* No Search Results */}
      {isSearchActive &&
        !isSearching &&
        !searchNotice &&
        searchResults.length === 0 && (
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
            <RemyStage context="search.empty" size={96} className="mx-auto mb-1" />
            <p className="text-charcoal-soft">No memories found.</p>
            <p className="mt-1 text-sm text-charcoal-muted">
              Try different keywords or phrases.
            </p>
          </div>
        )}

      {/* Empty */}
      {!isLoading &&
        normalizedMemories.length === 0 && (
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
            <RemyStage context="memories.empty" size={128} className="mx-auto mb-2" />
            <p className="text-charcoal-soft">No memories yet.</p>
            <p className="mt-1 text-sm text-charcoal-muted">
              Add your first memory to start your timeline.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
            >
              Add your first memory
            </button>
          </div>
        )}

      {/* TODAY */}
      {!isSearchActive && today.length > 0 && (
        <MemorySection
          label="Today"
          memories={today}
          onEdit={(m) => setEditingMemory(m)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* THIS WEEK */}
      {!isSearchActive && thisWeek.length > 0 && (
        <MemorySection
          label="This Week"
          memories={thisWeek}
          onEdit={(m) => setEditingMemory(m)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* EARLIER */}
      {!isSearchActive && earlier.length > 0 && (
        <MemorySection
          label="Earlier"
          memories={earlier}
          onEdit={(m) => setEditingMemory(m)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateMemoryModal
          onClose={() =>
            setShowCreate(false)
          }
          onCreate={async (data) => {
            await createMutation.mutateAsync(
              data
            );
          }}
        />
      )}

      {/* Edit Modal */}
      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onClose={() =>
            setEditingMemory(null)
          }
          onUpdate={async (data) => {
            await updateMutation.mutateAsync(
              {
                id: editingMemory.id,
                ...data,
              }
            );
          }}
        />
      )}

      {/* Storage-full (HTTP 413 from upload quota enforcement) */}
      <StorageFullModal
        quota={storageFull}
        onClose={() => setStorageFull(null)}
      />
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense fallback={null}>
      <MemoriesPageContent />
    </Suspense>
  );
}
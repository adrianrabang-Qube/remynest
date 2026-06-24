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

import MemorySection from "@/components/memories/MemorySection";
import { useIsNativePlatform } from "@/lib/platform";
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
    queryKey: ["active-profile"],
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
        : `/api/memories`;

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
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      <h1 className="text-2xl font-semibold">
        Your Memories
      </h1>

      {activeProfileId === undefined && (
        <div className="rounded-xl border p-4 bg-yellow-50">
          <p className="text-sm text-yellow-700">
            Loading workspace context...
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-gray-500">
          Loading memories...
        </p>
      )}

      {/* Background Refresh */}
      {isFetching &&
        !isLoading && (
          <p className="text-xs text-gray-400">
            Updating...
          </p>
        )}

      {/* Create Button */}
      <button
        onClick={() =>
          setShowCreate(true)
        }
        className="inline-flex items-center rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-sage-deep"
      >
        + New Memory
      </button>

      {/* Semantic Search — compact, and sticky on mobile so it stays reachable
          while scrolling the feed. Desktop layout unchanged. */}
      <div className="flex gap-2 max-md:sticky max-md:top-[calc(3.5rem_+_env(safe-area-inset-top))] max-md:z-20 max-md:-mx-4 max-md:bg-stone-50/95 max-md:px-4 max-md:py-2 max-md:backdrop-blur">
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) =>
            setSearchQuery(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="border rounded-lg px-3 py-2 w-full"
        />

        <button
          onClick={handleSearch}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Search
        </button>
      </div>

      {/* Searching */}
      {isSearching && (
        <p className="text-sm text-gray-500">
          Searching memories...
        </p>
      )}

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
          <div className="rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">
              No memories found.
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Try different keywords or phrases.
            </p>
          </div>
        )}

      {/* Empty */}
      {!isLoading &&
        normalizedMemories.length === 0 && (
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-8 text-center shadow-soft">
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
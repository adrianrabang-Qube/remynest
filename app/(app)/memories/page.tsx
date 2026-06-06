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

import MemoryCard from "@/components/MemoryCard";
import CreateMemoryModal from "@/components/CreateMemoryModal";
import EditMemoryModal from "@/components/EditMemoryModal";

type Memory = {
  id: string;
  title: string;
  content: string;
  created_at: string;
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

  const [showCreate, setShowCreate] =
    useState(false);

  const [editingMemory, setEditingMemory] =
    useState<Memory | null>(null);

  const [activeProfileId, setActiveProfileId] =
    useState<string | null | undefined>(undefined);

  const isMyNestContext =
    activeProfileId === null;

  const workspaceType =
    isMyNestContext
      ? "my-nest"
      : "care";

  // =========================
  // LOAD ACTIVE PROFILE
  // =========================
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(
          "/api/active-profile",
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setActiveProfileId(
          data.activeProfileId === null
            ? null
            : data.activeProfileId || null
        );
      } catch (error) {
        console.error(error);
      }
    }

    loadProfile();
  }, []);

  // =========================
  // SEMANTIC SEARCH STATE
  // =========================
  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Memory[]>([]);

  const [isSearching, setIsSearching] =
    useState(false);

  const isSearchActive =
    searchQuery.trim().length > 0;

  // =========================
  // LIVE SEARCH
  // =========================
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

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
  }, [searchQuery, activeProfileId, workspaceType]);

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
      const url =
        activeProfileId
          ? `/api/memories?profileId=${activeProfileId}`
          : `/api/memories`;

      const res = await fetch(
        url,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to fetch memories"
        );
      }

      const responseData =
  await res.json();

const normalizedMemories =
  normalizeMemoryArray(
    responseData
  );

console.log(
  "[memories-page] fetch-complete",
  {
    memoryCount:
      normalizedMemories.length,
  }
);

return normalizedMemories;
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
}) => {
      const payload =
  new FormData();

payload.append(
  "title",
  data.title
);

payload.append(
  "content",
  data.content
);

payload.append(
  "profileId",
  activeProfileId ?? ""
);

data.uploadedFiles?.forEach(
  (file) => {
    payload.append(
      "uploadedFiles",
      file
    );
  }
);

const res = await fetch(
  "/api/memories",
  {
    method: "POST",
    body: payload,
  }
);

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(
          responseData?.error ||
            responseData?.details ||
            "Failed to create memory"
        );
      }

      return responseData;
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

      setShowCreate(false);
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
    }: {
      id: string;
      title: string;
      content: string;
    }) => {
      const res = await fetch(
        `/api/memories/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title,
            content,
            profileId:
              activeProfileId,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to update memory"
        );
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

      setEditingMemory(null);
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
      new Date(
        b.created_at
      ).getTime() -
      new Date(
        a.created_at
      ).getTime()
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
      const date = new Date(
        memory.created_at
      );

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
    <div className="p-6 space-y-6">
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

      {/* Semantic Search */}
      <div className="flex gap-2">
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
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500">
              Semantic Search Results •{" "}
              {searchResults.length} found
            </h2>

            {searchResults.map(
              (memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={() =>
                    setEditingMemory(
                      memory
                    )
                  }
                  onDelete={() =>
                    deleteMutation.mutate(
                      memory.id
                    )
                  }
                />
              )
            )}
          </div>
        )}

      {/* No Search Results */}
      {isSearchActive &&
        !isSearching &&
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
        normalizedMemories.length ===
  0 && (
          <p className="text-gray-500">
            No memories yet.
          </p>
        )}

      {/* TODAY */}
      {!isSearchActive &&
        today.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Today
            </h2>

            <div className="space-y-4">
              {today.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={() =>
                    setEditingMemory(
                      memory
                    )
                  }
                  onDelete={() =>
                    deleteMutation.mutate(
                      memory.id
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

      {/* THIS WEEK */}
      {!isSearchActive &&
        thisWeek.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              This Week
            </h2>

            <div className="space-y-4">
              {thisWeek.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={() =>
                    setEditingMemory(
                      memory
                    )
                  }
                  onDelete={() =>
                    deleteMutation.mutate(
                      memory.id
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

      {/* EARLIER */}
      {!isSearchActive &&
        earlier.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Earlier
            </h2>

            <div className="space-y-4">
              {earlier.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={() =>
                    setEditingMemory(
                      memory
                    )
                  }
                  onDelete={() =>
                    deleteMutation.mutate(
                      memory.id
                    )
                  }
                />
              ))}
            </div>
          </div>
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
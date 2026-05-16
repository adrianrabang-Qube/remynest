"use client";

import { useEffect, useState } from "react";
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

export default function MemoriesPage() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] =
    useState(false);

  const [editingMemory, setEditingMemory] =
    useState<Memory | null>(null);

  const [activeProfileId, setActiveProfileId] =
    useState<string | null>(null);

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

        // ✅ FIXED
        setActiveProfileId(
          data.activeProfileId || null
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
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      activeProfileId,
    ],

    enabled: !!activeProfileId,

    queryFn: async () => {
      const res = await fetch(
        `/api/memories?profileId=${activeProfileId}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to fetch memories"
        );
      }

      return res.json();
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
    }) => {
      const res = await fetch(
        "/api/memories",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...data,
            profileId:
              activeProfileId,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to create memory"
        );
      }

      return res.json();
    },

    onMutate: async (newMemory) => {
      await queryClient.cancelQueries({
        queryKey: [
          "memories",
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
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
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
            activeProfileId,
          ]
        );

      queryClient.setQueryData<Memory[]>(
        [
          "memories",
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
          activeProfileId,
        ],
      });

      const previous =
        queryClient.getQueryData<Memory[]>(
          [
            "memories",
            activeProfileId,
          ]
        );

      queryClient.setQueryData<Memory[]>(
        [
          "memories",
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
          activeProfileId,
        ],
      });
    },
  });

  // =========================
  // SEMANTIC SEARCH
  // =========================
  async function handleSearch() {
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
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Search failed"
        );
      }

      const data = await res.json();

      setSearchResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }

  // =========================
  // SORT
  // =========================
  const sortedMemories = [
    ...memories,
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

      {!activeProfileId && (
        <div className="rounded-xl border p-4 bg-yellow-50">
          <p className="text-sm text-yellow-700">
            No active profile selected.
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
        className="text-blue-600"
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
        memories.length === 0 && (
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
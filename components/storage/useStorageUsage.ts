"use client";

import { useQuery } from "@tanstack/react-query";

/** Shape of GET /api/storage/usage (mirrors lib/storage StorageUsage — declared
 *  here so client code does not import the server-only usage module). */
export interface StorageUsageResponse {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  tier: "FREE" | "PREMIUM" | "FAMILY" | "ENTERPRISE";
  attachmentCount: number;
  memberUserIds: string[];
  degraded: boolean;
}

export function useStorageUsage() {
  return useQuery<StorageUsageResponse>({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const res = await fetch("/api/storage/usage", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load storage usage");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

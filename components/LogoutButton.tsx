"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // QA fix (2026-07-13): sign-out is an SPA navigation and the QueryClient is
    // mounted in the ROOT layout, so without this the previous user's cached
    // private data (memories, profile) survived logout and was served from cache
    // (staleTime 60s) to the NEXT account that logged in on a shared device.
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1 rounded-md bg-black text-white hover:opacity-80 transition"
    >
      Logout
    </button>
  );
}
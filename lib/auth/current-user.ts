import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Request-level memoized authenticated user.
 *
 * `supabase.auth.getUser()` is NOT a local cookie read — it validates the JWT
 * against the Supabase auth server over the network. The (app) layout, the page,
 * and identity/profile loaders each used to call it independently (~5-6 network
 * round-trips per navigation). React `cache()` memoizes the result for the
 * duration of a single server request, so all consumers within one render share
 * ONE validation. The cache is per-request (React clears it between requests), so
 * there is no cross-user/cross-request leakage — behavior is unchanged, only the
 * redundant round-trips are removed.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

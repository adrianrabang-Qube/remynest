import { createClient } from "@/utils/supabase/server";

export async function checkPremium() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isPremium: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  return {
    user,
    isPremium: profile?.is_premium ?? false,
  };
}
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function normalizeFormValue(
  value: FormDataEntryValue | null
): string {
  return String(value ?? "")
    .trim();
}

export function validateProfileId(
  profileId: string
): string {
  const normalized =
    profileId.trim();

  if (!normalized) {
    throw new Error(
      "Profile ID required"
    );
  }

  return normalized;
}

export async function requireDashboardUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    supabase,
    user,
  };
}

export function requireNonEmpty(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} required`
    );
  }

  return normalized;
}
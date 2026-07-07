"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createMemory(formData: FormData) {
  const supabase = await createClient();

  // Server-resolve ownership; never trust the client for it. Fail closed when
  // unauthenticated (do not rely on RLS alone for the app-layer guard).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const title = formData.get("title") as string
  const content = formData.get("content") as string

  await supabase.from("memories").insert({
    title,
    content,
    user_id: user.id,
  })

  revalidatePath("/memories")
}

export async function updateMemory(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const id = formData.get("id") as string
  const title = formData.get("title") as string
  const content = formData.get("content") as string

  // Scope by owner so a request can only ever touch the caller's own memory (no IDOR).
  await supabase
    .from("memories")
    .update({ title, content })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/memories")
}

export async function deleteMemory(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const id = formData.get("id") as string

  await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/memories")
}
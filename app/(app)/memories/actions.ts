"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createMemory(formData: FormData) {
  const supabase = createClient()

  const title = formData.get("title") as string
  const content = formData.get("content") as string

  await supabase.from("memories").insert({
    title,
    content,
  })

  revalidatePath("/memories")
}

export async function updateMemory(formData: FormData) {
  const supabase = createClient()

  const id = formData.get("id") as string
  const title = formData.get("title") as string
  const content = formData.get("content") as string

  await supabase
    .from("memories")
    .update({ title, content })
    .eq("id", id)

  revalidatePath("/memories")
}

export async function deleteMemory(formData: FormData) {
  const supabase = createClient()

  const id = formData.get("id") as string

  await supabase.from("memories").delete().eq("id", id)

  revalidatePath("/memories")
}
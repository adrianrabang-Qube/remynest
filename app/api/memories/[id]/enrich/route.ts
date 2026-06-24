import { createClient } from "@/lib/supabase/server";
import { enrichMemory } from "@/lib/memory-enrichment";

// Enrichment runs the AI cognition pipeline out-of-band, so give it its own generous
// execution budget — separate from the (now fast) create request.
export const maxDuration = 60;

/**
 * POST /api/memories/[id]/enrich
 *
 * Deferred enrichment trigger. The create route persists the memory immediately and the
 * client fires this fire-and-forget afterward. Always returns 200-ish JSON (never blocks
 * the user); scoped to the memory owner. Idempotent + retryable.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: memory, error } = await supabase
    .from("memories")
    .select("id, content, memory_profile_id, user_id, attachments")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !memory) {
    return Response.json({ ok: false, error: "Memory not found" }, { status: 404 });
  }

  const attachments = Array.isArray(memory.attachments) ? memory.attachments : [];

  const result = await enrichMemory({
    supabase,
    memoryId: memory.id,
    userId: user.id,
    profileId: memory.memory_profile_id ?? null,
    content: typeof memory.content === "string" ? memory.content : "",
    attachmentCount: attachments.length,
    attachmentTypes: attachments.map(
      (a: { type?: string; mimeType?: string }) => a?.type ?? a?.mimeType ?? "unknown",
    ),
  });

  return Response.json(result);
}

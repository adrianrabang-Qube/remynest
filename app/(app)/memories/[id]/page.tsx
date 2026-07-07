import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signMemory, signMemories } from "@/lib/memory-media-signing";
import MemoryCoverImage from "@/components/MemoryCoverImage";
import MemoryGallery from "@/components/memories/MemoryGallery";
import AIDisclaimer from "@/components/ai/AIDisclaimer";
import {
  formatMemoryDateLabel,
  formatAddedDate,
} from "@/lib/memories/memory-date";

type Props = {
  params: {
    id: string;
  };
};

type MemoryAttachment = {
  name?: string;
  filename?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  type?: string;
};

type RelatedMemory = {
  id: string;
  title?: string | null;
  ai_title?: string | null;
  content?: string | null;
  ai_summary?: string | null;
  similarity?: number | null;
  ai_mood?: string | null;
};

export default async function MemoryPage({
  params,
}: Props) {
  const supabase = await createClient();

  // 🔐 Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return notFound();
  }

  // 📦 Memory
  const { data: rawMemory, error } =
    await supabase
      .from("memories")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

  if (error || !rawMemory) {
    return notFound();
  }

  // Private media → short-lived signed URLs for this authorized memory.
  // Medium for the main gallery/viewer; thumb for the viewer's strip — signed in
  // parallel to overlap the round-trips.
  const [mediumSigned, memoryThumb] = await Promise.all([
    signMemory(rawMemory, { variant: "medium" }),
    signMemory(rawMemory, { variant: "thumb" }),
  ]);
  const memory = mediumSigned ?? rawMemory;

  const attachments = Array.isArray(memory.attachments)
    ? memory.attachments
    : [];

  // Visual media (images + videos) feed the swipeable gallery + full-screen
  // viewer; other media (audio/file) keep their inline native rendering below.
  const isVisualMedia = (a: MemoryAttachment) => {
    const t = a.type || "file";
    return t === "image" || t === "video";
  };
  const mediaAttachments = attachments.filter(
    (a: MemoryAttachment) => isVisualMedia(a) && a.url
  );
  const otherAttachments = attachments.filter(
    (a: MemoryAttachment) => !isVisualMedia(a)
  );

  // Strip thumbnails aligned (same order) with mediaAttachments: images use the
  // small thumb-variant URL; videos render a play tile (by type) so their slot is
  // left blank here. (memoryThumb is signed above in parallel with the medium variant.)
  const thumbAttachments =
    memoryThumb && Array.isArray(memoryThumb.attachments)
      ? (memoryThumb.attachments as MemoryAttachment[])
      : [];
  const mediaThumbnails = thumbAttachments
    .filter((a) => isVisualMedia(a) && a.url)
    .map((a) => ((a.type || "file") === "image" ? a.url ?? "" : ""));

  // 🔗 Semantic related memories
  let relatedMemories: RelatedMemory[] = [];

  if (memory.embedding) {
    const { data } =
      await supabase.rpc(
        "match_memories",
        {
          query_embedding:
            memory.embedding,
          match_threshold: 0.45,
          match_count: 3,
          user_id_input: user.id,
          memory_id_input:
            memory.id,
        }
      );

    // App-layer ownership backstop: never trust the match_memories RPC's own user
    // filtering (dashboard-managed / unverifiable). Keep only rows this user owns before
    // signing private media + rendering their content — mirrors the search route and
    // semantic-retrieval, which re-scope match_memories output for the same reason.
    const rpcRows = Array.isArray(data) ? data : [];
    const ids = rpcRows
      .map((r: { id?: string }) => r?.id)
      .filter((v: unknown): v is string => typeof v === "string");
    if (ids.length > 0) {
      const { data: owned } = await supabase
        .from("memories")
        .select("id")
        .eq("user_id", user.id)
        .in("id", ids);
      const ownedIds = new Set(
        (owned ?? []).map((r: { id: string }) => r.id)
      );
      relatedMemories = await signMemories(
        rpcRows.filter(
          (r: { id?: string }) => r.id != null && ownedIds.has(r.id)
        )
      );
    }
  }

  // 🎨 Confidence Width
  const confidence =
    memory.ai_confidence || 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back */}
      <Link
        href="/memories"
        className="text-sm text-gray-500 hover:text-black"
      >
        ← Back to Memories
      </Link>

      {/* Main Card */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
            Memory Intelligence
          </p>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                {memory.ai_title ||
                  memory.title}
              </h1>

              <p className="text-base font-medium text-sage-deep mt-3">
                🕰 Memory Date:{" "}
                {formatMemoryDateLabel(memory)}
              </p>
            </div>

            {/* Category */}
            {memory.ai_category && (
              <div className="bg-black text-white text-sm px-4 py-2 rounded-full">
                {memory.ai_category}
              </div>
            )}
          </div>
        </div>

        {/* Cover Image */}
        {memory.cover_image_url && (
          <div className="border-b border-gray-100 overflow-hidden">
            <MemoryCoverImage
              src={memory.cover_image_url}
              alt={memory.title || "Memory image"}
              className="w-full h-[420px] object-cover"
            />
          </div>
        )}

        {/* Cognitive Metadata */}
        <div className="p-8 border-b border-gray-100 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              Cognitive Analysis
            </h2>

            <div className="flex flex-wrap gap-3">
              {/* Mood */}
              {memory.ai_mood && (
                <div className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  Mood: {memory.ai_mood}
                </div>
              )}

              {/* Importance */}
              {memory.ai_importance && (
                <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  Importance:{" "}
                  {memory.ai_importance}
                </div>
              )}

              {/* Sentiment */}
              {memory.ai_sentiment && (
                <div className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                  Sentiment:{" "}
                  {memory.ai_sentiment}
                </div>
              )}

              {/* Emotional Weight */}
              {memory.ai_emotional_weight && (
                <div className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                  Emotional Weight:{" "}
                  {
                    memory.ai_emotional_weight
                  }
                </div>
              )}
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">
                AI Confidence
              </span>

              <span className="text-sm font-semibold text-gray-800">
                {confidence}%
              </span>
            </div>

            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                style={{
                  width: `${confidence}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* AI safety disclaimer for cognitive analysis */}
        <div className="px-8 pb-6 -mt-2">
          <AIDisclaimer
            variant="footnote"
            kind="cognitive"
          />
        </div>

        {/* Original Memory */}
        <div className="p-8 border-b border-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Original Memory
          </h2>

          <div className="bg-gray-50 rounded-2xl p-6 text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
            {memory.content}
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="p-8 border-b border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Attachments
            </h2>

            {mediaAttachments.length > 0 && (
              <MemoryGallery
                images={mediaAttachments}
                thumbnails={mediaThumbnails}
              />
            )}

            {otherAttachments.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {otherAttachments.map((attachment: MemoryAttachment, index: number) => {
                const name =
                  attachment.name ||
                  attachment.filename ||
                  "Attachment";
                const url = attachment.url;
                const size =
                  typeof attachment.size === "number"
                    ? `${(attachment.size / 1024).toFixed(1)} KB`
                    : null;
                const mimeType = attachment.mimeType || "";
                const type = attachment.type || "file";

                // Video is rendered by the gallery/viewer above (mediaAttachments);
                // otherAttachments only contains audio/file here.
                if (type === "audio") {
                  return (
                    <div
                      key={index}
                      className="rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-sm p-4"
                    >
                      <div className="font-semibold text-sm text-gray-900 mb-3">
                        {name}
                      </div>
                      <audio
                        src={url}
                        controls
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-3">
                        {mimeType}
                        {size ? ` · ${size}` : ""}
                      </div>
                    </div>
                  );
                }

                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-3xl border border-gray-100 bg-white shadow-sm p-4 block hover:border-black transition"
                  >
                    <div className="font-semibold text-sm text-gray-900">
                      {name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {mimeType}
                      {size ? ` · ${size}` : ""}
                    </div>
                    <div className="text-xs text-blue-600 mt-3">
                      Open file
                    </div>
                  </a>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* AI Summary */}
        {memory.ai_summary && (
          <div className="p-8 border-b border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              AI Summary
            </h2>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-gray-700 italic leading-relaxed whitespace-pre-wrap break-words">
              {memory.ai_summary}
            </div>

            <AIDisclaimer
              variant="footnote"
              kind="general"
            />
          </div>
        )}

        {/* AI Tags */}
        {memory.ai_tags &&
          memory.ai_tags.length > 0 && (
            <div className="p-8 border-b border-gray-100 space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Semantic Tags
              </h2>

              <div className="flex flex-wrap gap-3">
                {memory.ai_tags.map(
                  (
                    tag: string,
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm"
                    >
                      #{tag}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Related Memories */}
        {relatedMemories &&
          relatedMemories.length > 0 && (
            <div className="p-8 border-b border-gray-100 space-y-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Related Memories
              </h2>

              <div className="space-y-4">
                {relatedMemories.map(
                  (
                    related
                  ) => (
                    <Link
                      key={related.id}
                      href={`/memories/${related.id}`}
                      className="block border border-gray-100 rounded-2xl p-5 hover:border-black transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {related.ai_title ||
                              related.title}
                          </h3>

                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {related.ai_summary ||
                              related.content}
                          </p>

                          {/* Similarity Score */}
                          {related.similarity && (
                            <div className="mt-3 text-xs text-gray-400">
                              Semantic Similarity:{" "}
                              {Math.round(
                                related.similarity *
                                  100
                              )}
                              %
                            </div>
                          )}
                        </div>

                        {related.ai_mood && (
                          <div className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                            {
                              related.ai_mood
                            }
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50">
          {formatAddedDate(memory.created_at) && (
            <p className="text-xs text-gray-400 mb-3">
              Added to RemyNest on{" "}
              {formatAddedDate(memory.created_at)}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-500">
              Semantic Memory Stored
            </div>

            <div className="text-xs text-gray-400">
              RemyNest Cognitive Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
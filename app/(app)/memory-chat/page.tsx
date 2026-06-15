import { redirect } from "next/navigation";

/**
 * Memory Chat is consolidated into Remy — the single AI surface of RemyNest.
 * This route permanently redirects to /remy (the workspace-scoped Ask Remy
 * pipeline: hybrid semantic + deterministic retrieval, People Intelligence, and
 * Relationship Intelligence). No AI capability is lost — semantic retrieval and
 * every other intelligence layer live on inside /remy; the underlying
 * `/api/memory-chat` route and `retrieve-memory-context` are left intact as
 * internal implementation details. Users only ever see Remy.
 */
export default function MemoryChatPage() {
  redirect("/remy");
}

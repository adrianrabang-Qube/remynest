import CreateMemoryForm from "@/components/CreateMemoryForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New memory · RemyNest",
};

/**
 * "New memory" route — the destination of the mobile center "+" FAB
 * (components/navigation/nav-config.ts). Renders the production CreateMemoryForm
 * (multipart upload via /api/memories/create with real bytes, AttachmentManager,
 * storage-quota 413 handling) — NOT the prior orphan form that POSTed file metadata
 * only and silently dropped photo uploads.
 */
export default function NewMemoryPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-charcoal">New memory</h1>
      <CreateMemoryForm />
    </div>
  );
}

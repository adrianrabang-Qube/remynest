
"use client";

export const dynamic = "force-dynamic";

import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewMemoryPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleCreate = async () => {
    if (!title || !content) {
      alert("Fill all fields");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/memories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        attachments: files.map((file) => ({
          filename: file.name,
          type: file.type,
          size: file.size,
        })),
      }),
    });

    if (!res.ok) {
      alert("Failed to create memory");
      setLoading(false);
      return;
    }

    router.push("/memories");
  };

  const handleFiles = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    setFiles(Array.from(e.target.files));
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create New Memory</h1>

      <div className="bg-white rounded-xl shadow p-6 border flex flex-col gap-4">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
        />

        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-3 rounded h-32 resize-none focus:outline-none focus:ring-2 focus:ring-black"
        />

        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFiles}
          className="border p-3 rounded"
        />

        {files.length > 0 && (
          <div className="border rounded p-3 text-sm space-y-2">
            <p className="font-medium">Selected files</p>
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`}>
                {file.name}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-black text-white py-3 rounded hover:opacity-80 transition"
        >
          {loading ? "Creating..." : "Create Memory"}
        </button>
      </div>
    </div>
  );
}
import { createClient } from "@/lib/supabase/server";

export default async function TimelinePage() {
  const supabase = createClient();

  // 🔐 Get logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🚫 Not logged in
  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Please log in
        </h1>
      </div>
    );
  }

  // 📦 Fetch memories
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Timeline
      </h1>

      {!memories || memories.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600">
            No memories yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg text-gray-900">
                  {memory.title || "Untitled Memory"}
                </h2>

                <span className="text-sm text-gray-500">
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap">
                {memory.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { createClient } from "@/lib/supabase/server"
import MemoryForm from "@/components/MemoryForm"
import { createMemory, updateMemory, deleteMemory } from "./actions"

export default async function MemoriesPage() {
  const supabase = createClient()

  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      <h1 className="text-3xl font-semibold text-[#2F3E34]">
        Your <span className="text-[#E6A57E] italic">Memories</span>
      </h1>

      {/* Create Memory */}
      <div className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/40">
        <MemoryForm action={createMemory} />
      </div>

      {/* Memory List */}
      <div className="space-y-6">
        {memories?.map((m) => (
          <div
            key={m.id}
            className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/40"
          >
            <MemoryForm
              action={updateMemory}
              id={m.id}
              defaultTitle={m.title}
              defaultContent={m.content}
              buttonText="Save Changes"
            />

            <form action={deleteMemory} className="mt-4">
              <input type="hidden" name="id" value={m.id} />
              <button className="text-red-400 text-sm hover:underline">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>

    </div>
  )
}
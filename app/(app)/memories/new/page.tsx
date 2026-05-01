import MemoryForm from "@/components/MemoryForm"
import { createMemory } from "../actions"

export default function NewMemoryPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      
      <h1 className="text-3xl font-semibold text-[#2F3E34]">
        Create <span className="text-[#E6A57E] italic">Memory</span>
      </h1>

      <div className="bg-white/90 backdrop-blur rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/40">
        <MemoryForm action={createMemory} />
      </div>

    </div>
  )
}
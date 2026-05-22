import CreateMemoryForm from "@/components/CreateMemoryForm";

export default function DashboardCreateMemory() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h2 className="text-2xl font-semibold mb-2 text-[#2f3e34]">
        Create Memory
      </h2>

      <p className="text-gray-500 mb-5">
        Save an important moment,
        thought, experience,
        reminder, or cognitive insight.
      </p>

      <CreateMemoryForm />

    </div>
  );
}
export default function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: any) {
  return (
    <div className="border rounded-xl p-4 mb-4 bg-white shadow-sm hover:shadow-md transition">
      <h3 className="font-semibold text-lg">{memory.title}</h3>
      <p className="text-sm text-gray-600 mb-2">{memory.content}</p>

      <div className="flex gap-4 text-sm">
        <button onClick={onEdit} className="text-blue-500 hover:underline">
          Edit
        </button>
        <button onClick={onDelete} className="text-red-500 hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}
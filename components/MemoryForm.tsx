"use client"

type Props = {
  action: (formData: FormData) => void
  id?: string
  defaultTitle?: string
  defaultContent?: string
  buttonText?: string
}

export default function MemoryForm({
  action,
  id,
  defaultTitle = "",
  defaultContent = "",
  buttonText = "Save Memory",
}: Props) {
  return (
    <form action={action} className="space-y-4">

      {id && <input type="hidden" name="id" value={id} />}

      <input
        name="title"
        defaultValue={defaultTitle}
        placeholder="Title"
        className="w-full border border-gray-200 rounded-xl p-3"
      />

      <textarea
        name="content"
        defaultValue={defaultContent}
        placeholder="Content"
        className="w-full border border-gray-200 rounded-xl p-3 min-h-[120px]"
      />

      <button
        type="submit"
        className="bg-[#6C8F7C] text-white px-5 py-2.5 rounded-full hover:opacity-90 transition"
      >
        {buttonText}
      </button>

    </form>
  )
}
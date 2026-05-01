"use client"

import { useFormStatus } from "react-dom"

export default function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-4 py-2 text-white ${
        pending ? "bg-gray-400" : "bg-black"
      }`}
    >
      {pending ? "Loading..." : text}
    </button>
  )
}
"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

import { Remy } from "@/components/remy/Remy"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] gap-4">
      <Remy state="confused" size={140} decorative />
      <h2 className="text-xl font-semibold">Something went wrong</h2>

      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-black text-white rounded"
      >
        Try again
      </button>
    </div>
  )
}
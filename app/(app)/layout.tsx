import Link from "next/link"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-8">
            RemyNest
          </h1>

          <nav className="space-y-3 text-gray-600">
            <Link href="/dashboard" className="block hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/memories" className="block hover:text-blue-600">
              Memories
            </Link>
            <Link href="/memories/new" className="block hover:text-blue-600">
              New Memory
            </Link>
            <Link href="/timeline" className="block hover:text-blue-600">
              Timeline
            </Link>
            <Link href="/reminders" className="block hover:text-blue-600">
              Reminders
            </Link>
          </nav>
        </div>

        <form action="/auth/logout">
          <button className="w-full bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition">
            Logout
          </button>
        </form>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  )
}
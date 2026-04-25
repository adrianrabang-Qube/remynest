import Link from "next/link"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: "#111",
          color: "#fff",
          padding: 20,
        }}
      >
        <h3>Remydr</h3>

        <nav style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/memories">Memories</Link>
          <Link href="/new">New Memory</Link>
          <Link href="/timeline">Timeline</Link>
          <Link href="/reminders">Reminders</Link>
        </nav>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: 20 }}>
        {children}
      </main>
    </div>
  )
}